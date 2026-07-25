"""F3 — run orchestration.

Two modes (NFR-2):
- triage: one cheap LLM pass → quick score. Funnel-scale tier; also the R2 fallback.
- full:   MiroFish swarm (GraphRAG personas → OASIS beat-by-beat simulation).

Hour 0-8 spike question lives here: does MiroFish accept our story-as-event-stream
seed? If not → interrogate.py fallback path (direct persona loop).
"""
import json
import logging
from datetime import datetime, timezone

from openai import OpenAI

from app.config import get_settings
from app.db import SessionLocal
from app.models import Panel, Persona, Report, Run, Submission
from app.services.simulation.mirofish_client import MiroFishClient

log = logging.getLogger(__name__)

CONFIDENCE_NOTE = (
    "Simulation forecast, not ground truth. Scores derive from LLM-simulated listener "
    "personas; persona fidelity for the target demographic is uncalibrated. Treat "
    "deltas as directional. (FR-6.2)"
)


def execute_run_task(run_id: str) -> None:
    db = SessionLocal()
    try:
        run = db.get(Run, run_id)
        if not run:
            return
        run.status = "running"
        run.started_at = datetime.now(timezone.utc)
        db.commit()

        sub = db.get(Submission, run.submission_id)
        panel = db.get(Panel, run.panel_id)
        try:
            if run.mode == "triage":
                _run_triage(db, run, sub, panel)
            else:
                try:
                    _run_full(db, run, sub, panel)
                except Exception:  # noqa: BLE001 — NFR-6: swarm failure degrades to triage
                    log.exception("full run failed — falling back to triage mode")
                    run.mode = "triage"
                    _run_triage(db, run, sub, panel)
            run.status = "done"
        except Exception as exc:  # noqa: BLE001
            log.exception("run failed")
            run.status = "failed"
            run.error = str(exc)[:500]
        run.finished_at = datetime.now(timezone.utc)
        db.commit()
    finally:
        db.close()


def _mock_verdict(sub: Submission, panel: Panel) -> dict:
    """DEMO_MOCK: canned-but-plausible verdict keyed to real beat indices."""
    beats = (sub.story_rep or {}).get("beats", [])
    n = max(len(beats), 1)
    cliff_beat = min(6, n - 1)
    dropoff = [
        {
            "beat_idx": b["idx"],
            "retained_pct": max(100 - b["idx"] * (55 / n) - (25 if b["idx"] >= cliff_beat else 0), 15),
            "cliff": b["idx"] == cliff_beat,
            "cause": "twist telegraphed two beats earlier (mock)" if b["idx"] == cliff_beat else None,
            "paywall_risk": b["idx"] == cliff_beat and b.get("episode", 1) <= 10,
        }
        for b in beats
    ]
    groups = (panel.config.get("genre_affinities") or ["romance", "thriller"])[:2]
    return {
        "score": 6.8,
        "rationale": "[MOCK RUN — no LLM] Strong opening hook; midpoint reveal is predictable, "
        "causing the main drop-off cliff. Panel splits by genre taste.",
        "pros": [{"text": "Opening beat establishes conflict fast", "persona_refs": ["Asha-L00"]}],
        "cons": [{"text": f"Beat {cliff_beat} twist is guessable", "persona_refs": ["Ravi-L01"]}],
        "dropoff": dropoff,
        "segments": [{"group": groups[0], "score": 7.9, "n": 12}, {"group": groups[-1], "score": 4.2, "n": 8}],
        "fixes": [
            {"priority": 1, "text": f"Delay the beat-{cliff_beat} reveal by one episode", "est_delta": "+1.0 score (mock)"},
            {"priority": 2, "text": "Add a counter-hook for thriller listeners in episode 1", "est_delta": "+0.5 segment score (mock)"},
        ],
    }


def _run_triage(db, run: Run, sub: Submission, panel: Panel) -> None:
    """Single-pass panel-conditioned critique. Cheap tier + demo fallback (NFR-6)."""
    if get_settings().demo_mock:
        _save_report(db, run, _mock_verdict(sub, panel))
        return
    client = OpenAI(api_key=get_settings().openai_api_key)
    prompt = (
        "You simulate an audience panel reacting to a serialized audio-drama story, "
        f"panel config: {json.dumps(panel.config)}. Story beats: "
        f"{json.dumps(sub.story_rep)[:40_000]}\n"
        "Return STRICT JSON: {score: float 0-10, rationale: str, "
        "pros: [{text, persona_refs: []}], cons: [{text, persona_refs: []}], "
        "dropoff: [{beat_idx, retained_pct, cliff, cause, paywall_risk}], "
        "segments: [{group, score, n}], "
        "fixes: [{priority, text, est_delta}]}"
    )
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[{"role": "user", "content": prompt}],
    )
    run.cost_tokens = resp.usage.total_tokens if resp.usage else 0
    data = json.loads(resp.choices[0].message.content)
    _save_report(db, run, data)


def _run_full(db, run: Run, sub: Submission, panel: Panel) -> None:
    """MiroFish swarm path (FR-3.1..3.4).

    TODO(hour 0-8 spike): confirm seed format; adapt story beats → event stream.
    Fallback if MiroFish frame distorts: direct OASIS/CAMEL persona loop.
    """
    mf = MiroFishClient()
    try:
        sim = mf.simulate(story_rep=sub.story_rep, panel_config=panel.config)
    finally:
        mf.http.close()  # per-run client; don't leak sockets across runs

    # Persist personas + event logs for chat/traceability (F5, NFR-3)
    for p in sim["personas"]:
        db.add(
            Persona(
                run_id=run.id,
                group_label=p["group_label"],
                profile=p["profile"],
                event_log=p["event_log"],
                dropped_at_beat=p.get("dropped_at_beat"),
            )
        )
    run.cost_tokens = sim.get("cost_tokens", 0)
    _save_report(db, run, sim["report"])


def _save_report(db, run: Run, data: dict) -> None:
    db.add(
        Report(
            run_id=run.id,
            score=float(data["score"]),
            rationale=data["rationale"],
            pros=data["pros"],
            cons=data["cons"],
            dropoff=data["dropoff"],
            segments=data["segments"],
            fixes=data["fixes"],
            confidence_note=CONFIDENCE_NOTE,
        )
    )
    # Databricks gold-table mirror (sponsor integration, non-fatal no-op without env)
    from app.services import lakehouse

    lakehouse.mirror_verdict(run.id, run.content_hash, run.panel_id, {**data, "confidence_note": CONFIDENCE_NOTE})
