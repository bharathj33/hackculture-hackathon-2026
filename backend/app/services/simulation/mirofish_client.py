"""MiroFish HTTP client — real integration (spike complete).

Chain (verified against vendor/MiroFish/backend):
  1. POST /api/graph/ontology/generate   multipart: files[]=seed.md,
     simulation_requirement, project_name              (SYNC, LLM inline)
  2. POST /api/graph/build {project_id}                (TASK → poll /api/graph/task/<id>)
  3. POST /api/simulation/create {project_id}          (both platforms MUST stay true —
     single-platform sims never report "prepared"; narrow via platform= at start)
  4. POST /api/simulation/prepare {simulation_id}      (TASK → poll /prepare/status)
  5. POST /api/simulation/start {simulation_id, platform:"parallel", max_rounds}
  6. GET  /api/simulation/<id>/run-status              (poll until completed/stopped)
  7. POST /api/report/generate {simulation_id}         (TASK → poll /generate/status)
  8. GET  /api/report/<report_id>                      (markdown + outline)

Key adaptation (persona-count lever): agent count == entities extracted from seed
docs. So the seed markdown embeds the PANEL — one named listener-profile block per
persona — alongside the story beats. Ontology extracts listeners as entities →
they become the simulated agents.

Interview (/api/simulation/interview) requires a LIVE OASIS env — call during/just
after the run, before close-env. Post-run chat falls back to interrogate.py
(stored event logs).
"""
import json
import logging
import time

import httpx
from openai import OpenAI

from app.config import get_settings
from app.services.listener_identity import build_panel_cast, seed_block

log = logging.getLogger(__name__)


class MiroFishError(RuntimeError):
    pass


class MiroFishClient:
    def __init__(self) -> None:
        s = get_settings()
        self.http = httpx.Client(base_url=s.mirofish_base_url, timeout=900)
        self._openai_client: OpenAI | None = None

    @property
    def _openai(self) -> OpenAI:
        if self._openai_client is None:
            self._openai_client = OpenAI(api_key=get_settings().openai_api_key)
        return self._openai_client

    # ---------- public ----------

    def simulate(self, story_rep: dict, panel_config: dict, max_rounds: int = 6, on_stage=None) -> dict:
        """Full chain. Returns {personas, report, cost_tokens} in OUR schema.

        on_stage: optional callback(str) fired at each chain boundary so the caller
        can surface progress (persisted to Run.stage for the UI).
        """
        stage = on_stage or (lambda _s: None)
        seed_md = self._build_seed_markdown(story_rep, panel_config)
        requirement = self._build_requirement(panel_config)

        stage("knowledge graph")
        project_id = self._ontology(seed_md, requirement)
        self._graph_build(project_id)
        sim_id = self._sim_create(project_id)
        stage("casting personas")
        self._sim_prepare(sim_id)
        stage("swarm rounds")
        self._sim_start(sim_id, max_rounds=max_rounds)
        self._wait_run(sim_id, on_round=stage)
        stage("compiling verdict")
        report_id = self._report_generate(sim_id)
        raw_report = self._get_report(report_id)
        timeline = self._get_timeline(sim_id)
        profiles = self._get_profiles(sim_id)

        # Anti-hallucination gate: transform must be grounded in real sim artifacts
        # (NFR-3). Empty timeline → fail loud, never let gpt-4o fabricate a verdict.
        if not timeline:
            raise MiroFishError(f"simulation {sim_id} produced no timeline — refusing ungrounded transform")

        report, personas, tokens = self._transform(story_rep, panel_config, raw_report, timeline, profiles)
        personas = self._enrich_personas(personas, panel_config, profiles)
        return {"personas": personas, "report": report, "cost_tokens": tokens, "sim_id": sim_id}

    def chat_with_persona(self, sim_id: str, agent_id: int, message: str) -> str:
        """FR-5.1 while OASIS env alive. 400 → env closed → caller falls back."""
        r = self.http.post(
            "/api/simulation/interview",
            json={"simulation_id": sim_id, "agent_id": agent_id, "prompt": message, "platform": "reddit", "timeout": 60},
        )
        data = self._ok(r)
        return data["result"].get("response") or json.dumps(data["result"])

    # ---------- seed construction (the adaptation) ----------

    @staticmethod
    def _build_seed_markdown(story_rep: dict, panel_config: dict) -> str:
        """Story beats + embedded listener panel (entities → agents)."""
        parts = ["# Audio Drama Story\n"]
        for b in story_rep["beats"]:
            tags = []
            if b.get("is_hook"):
                tags.append("HOOK")
            if b.get("is_cliffhanger"):
                tags.append("CLIFFHANGER")
            tag_s = f" [{'/'.join(tags)}]" if tags else ""
            parts.append(f"## Episode {b.get('episode', 1)} — Beat {b['idx']}{tag_s}\n{b['summary']}\n\n> {b['text_span']}\n")

        parts.append("\n# Listener Panel\n")
        for entry in build_panel_cast(panel_config):
            parts.append(seed_block(entry))
        return "\n".join(parts)

    @staticmethod
    def _build_requirement(panel_config: dict) -> str:
        genres = ", ".join(panel_config.get("genre_affinities") or ["general"])
        return (
            "Predict how this listener panel reacts to the serialized audio-drama story, "
            "episode by episode and beat by beat. The simulation agents are the LISTENERS "
            "described in the 'Listener Panel' section (entities named like 'Asha-L00') — "
            "each listener must be extracted as a distinct person entity; story characters "
            "are subjects of discussion, not agents. Specifically: (1) where listeners stop "
            "listening and why; (2) which hooks and cliffhangers work; (3) how reactions "
            f"differ across listener types (genre tastes: {genres}); (4) overall appeal "
            "score out of 10 with pros, cons, and the highest-impact improvements."
        )

    # ---------- chain steps ----------

    def _ok(self, r: httpx.Response) -> dict:
        try:
            body = r.json()
        except ValueError:  # proxy 502s / non-JSON bodies
            raise MiroFishError(f"{r.request.url.path}: {r.status_code} non-JSON response")
        if r.status_code >= 400 or not body.get("success", False):
            raise MiroFishError(f"{r.request.url.path}: {r.status_code} {body.get('error')}")
        return body.get("data", body)

    def _ontology(self, seed_md: str, requirement: str) -> str:
        r = self.http.post(
            "/api/graph/ontology/generate",
            files={"files": ("seed.md", seed_md.encode(), "text/markdown")},
            data={"simulation_requirement": requirement, "project_name": "storycritic"},
        )
        return self._ok(r)["project_id"]

    def _poll(self, fetch, *, done, failed, timeout_s: int = 900, every: int = 5, label: str = "poll"):
        """Shared bounded poll: fetch() → dict; done(d)/failed(d) → bool."""
        deadline = time.time() + timeout_s
        while time.time() < deadline:
            time.sleep(every)
            d = fetch()
            if done(d):
                return d
            if failed(d):
                raise MiroFishError(f"{label} failed: {d.get('error')}")
        raise MiroFishError(f"{label} timeout ({timeout_s}s)")

    def _graph_build(self, project_id: str) -> None:
        r = self.http.post("/api/graph/build", json={"project_id": project_id})
        data = self._ok(r)
        if data.get("reused"):
            return
        self._poll_task(f"/api/graph/task/{data['task_id']}")

    def _sim_create(self, project_id: str) -> str:
        # both platforms true — single-platform never reports "prepared" (upstream bug)
        r = self.http.post(
            "/api/simulation/create",
            json={"project_id": project_id, "enable_twitter": True, "enable_reddit": True},
        )
        return self._ok(r)["simulation_id"]

    def _sim_prepare(self, sim_id: str) -> None:
        r = self.http.post("/api/simulation/prepare", json={"simulation_id": sim_id})
        data = self._ok(r)
        if data.get("already_prepared"):
            return
        self._poll(
            lambda: self._ok(self.http.post("/api/simulation/prepare/status", json={"simulation_id": sim_id})),
            done=lambda s: s.get("status") in ("ready", "completed"),
            failed=lambda s: s.get("status") == "failed",
            label="prepare",
        )

    def _sim_start(self, sim_id: str, max_rounds: int) -> None:
        # platform="reddit" (not "parallel"): both platforms must be ENABLED at create
        # (prepare bug), but running one platform halves sim cost/latency
        self._ok(
            self.http.post(
                "/api/simulation/start",
                json={"simulation_id": sim_id, "platform": "reddit", "max_rounds": max_rounds},
            )
        )

    def _wait_run(self, sim_id: str, timeout_s: int = 3600, on_round=None) -> None:
        # 3600s: Railway's shared vCPU runs OASIS agent-graph generation far slower
        # than local; 1800s starved otherwise-healthy runs into the triage fallback.
        deadline = time.time() + timeout_s
        last_round = None
        while time.time() < deadline:
            time.sleep(10)
            s = self._ok(self.http.get(f"/api/simulation/{sim_id}/run-status"))
            st = s.get("runner_status")
            log.info("run %s: %s round %s/%s", sim_id, st, s.get("current_round"), s.get("total_rounds"))
            cur, tot = s.get("current_round"), s.get("total_rounds")
            if on_round and cur is not None and cur != last_round:
                last_round = cur
                on_round(f"swarm rounds {cur}/{tot or '?'}")
            if st in ("completed", "stopped"):
                return
            if st == "failed":
                raise MiroFishError(f"simulation failed: {s.get('error')}")
        raise MiroFishError("simulation timeout")

    def _report_generate(self, sim_id: str) -> str:
        r = self.http.post("/api/report/generate", json={"simulation_id": sim_id})
        data = self._ok(r)
        report_id = data["report_id"]
        if data.get("already_generated"):
            return report_id
        # simulation_id alone only answers once a COMPLETED report exists; while the task
        # is still running the endpoint requires task_id and 400s without it. Send both:
        # task_id drives the poll, simulation_id short-circuits an already-finished report.
        status_body = {"simulation_id": sim_id}
        if data.get("task_id"):
            status_body["task_id"] = data["task_id"]
        s = self._poll(
            lambda: self._ok(self.http.post("/api/report/generate/status", json=status_body)),
            done=lambda s: s.get("status") == "completed" or s.get("already_completed"),
            failed=lambda s: s.get("status") == "failed",
            every=8,
            label="report",
        )
        return s.get("report_id", report_id)

    def _get_report(self, report_id: str) -> dict:
        return self._ok(self.http.get(f"/api/report/{report_id}"))

    def _get_timeline(self, sim_id: str) -> list:
        try:
            return self._ok(self.http.get(f"/api/simulation/{sim_id}/timeline")).get("timeline", [])
        except MiroFishError:
            return []

    def _get_profiles(self, sim_id: str) -> list:
        try:
            data = self._ok(self.http.get(f"/api/simulation/{sim_id}/profiles"))
            return data if isinstance(data, list) else data.get("profiles", [])
        except MiroFishError:
            return []

    def _poll_task(self, path: str, timeout_s: int = 900) -> dict:
        t = self._poll(
            lambda: self._ok(self.http.get(path)),
            done=lambda t: t["status"] == "completed",
            failed=lambda t: t["status"] == "failed",
            timeout_s=timeout_s,
            label=f"task {path}",
        )
        return t.get("result", {})

    # ---------- transform to our schema ----------

    def _transform(self, story_rep: dict, panel_config: dict, raw_report: dict, timeline: list, profiles: list):
        """MiroFish markdown report + timeline → our Report/Persona schema.

        One structuring LLM call; grounded in simulation artifacts (NFR-3).
        """
        beats = [{"idx": b["idx"], "summary": b["summary"], "episode": b.get("episode", 1)} for b in story_rep["beats"]]
        prompt = (
            "Convert this audience-simulation output into a critique verdict.\n"
            f"STORY BEATS: {json.dumps(beats)[:8000]}\n"
            f"SIMULATION REPORT (markdown): {(raw_report.get('markdown_content') or '')[:30000]}\n"
            f"TIMELINE (agent actions per round): {json.dumps(timeline)[:20000]}\n"
            "Return STRICT JSON: {report: {score: float 0-10, rationale: str, "
            "pros: [{text, persona_refs: [str]}], cons: [{text, persona_refs: [str]}], "
            "dropoff: [{beat_idx: int, retained_pct: float, cliff: bool, cause: str|null, paywall_risk: bool}], "
            "segments: [{group: str, score: float, n: int}], "
            "fixes: [{priority: int, text: str, est_delta: str}]}, "
            "personas: [{group_label: str, profile: {name: str, agent_id: int|null, summary: str, persona_prompt: str}, "
            "event_log: [{beat_idx: int, action: str, note: str}], dropped_at_beat: int|null}]}\n"
            "Ground every claim in the report/timeline; dropoff must cover all episodes; "
            "flag paywall_risk=true for cliffs in episodes 1-10. "
            "Write every text field in English regardless of the story's language."
        )
        resp = self._openai.chat.completions.create(
            model=get_settings().model_transform,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}],
        )
        data = json.loads(resp.choices[0].message.content)
        tokens = resp.usage.total_tokens if resp.usage else 0
        return data["report"], data["personas"], tokens

    @staticmethod
    def _enrich_personas(personas: list, panel_config: dict, profiles: list) -> list:
        """Attach canonical persona_prompt + MiroFish agent_id from cast seed."""
        from app.services.listener_identity import cast_by_handle

        cast_map = cast_by_handle(panel_config)
        agent_by_name: dict[str, int] = {}
        for prof in profiles:
            if not isinstance(prof, dict):
                continue
            name = (prof.get("name") or prof.get("handle") or prof.get("entity_name") or "").strip()
            aid = prof.get("agent_id", prof.get("id"))
            if name and aid is not None:
                try:
                    agent_by_name[name] = int(aid)
                except (TypeError, ValueError):
                    pass

        for persona in personas:
            profile = persona.setdefault("profile", {})
            name = (profile.get("name") or "").strip()
            cast = cast_map.get(name)
            if cast:
                profile.setdefault("summary", cast["profile"])
                profile["persona_prompt"] = cast["persona_prompt"]
            elif name:
                for handle, entry in cast_map.items():
                    if handle.lower() == name.lower():
                        profile.setdefault("summary", entry["profile"])
                        profile["persona_prompt"] = entry["persona_prompt"]
                        break
            if profile.get("agent_id") is None and name in agent_by_name:
                profile["agent_id"] = agent_by_name[name]
        return personas
