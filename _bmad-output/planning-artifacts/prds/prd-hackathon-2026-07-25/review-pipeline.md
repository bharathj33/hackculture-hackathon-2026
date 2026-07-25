# Adversarial Review — StoryCritic Pipeline (T-12h)

Reviewer stance: cynical staff engineer, 12 hours before demo. Sources: `backend/ARCHITECTURE.md`, `backend/ETL-DATABRICKS.md`, `backend/app/services/simulation/mirofish_client.py`, PRD §5–9, and the actual MiroFish vendor code under `vendor/MiroFish/backend` (claims below are verified against it, not the docs).

**Verdict: the full-mode pipeline cannot meet NFR-1 cold. It only demos if you pre-run everything tonight, pin the MiroFish process, and hard-fail on empty timelines instead of silently hallucinating a report. Triage mode is the real demo; full mode is a pre-recorded credibility prop unless the mitigations below land.**

---

## Attack 1 — Latency: NFR-1 (≤5 min) vs. an 8-step chain with a cloud graph build in the middle

### The budget nobody wrote down

Realistic cold wall-clock for text input, 30-persona panel, `max_rounds=6`:

| Step | What actually happens | Realistic time |
|---|---|---|
| Ontology generate | SYNC LLM call inline on the HTTP request (client timeout 900s exists for a reason) | 30–90 s |
| Graph build | Seed split into 500-char chunks (`graph_builder.py`), batched to **Zep Cloud**, then `_wait_for_batch` on Zep's async episode-extraction queue. A ~12–15 KB seed (beats + 20 listener blocks) ≈ 25–35 episodes, each LLM-processed on Zep's side. Entirely outside our control. | 3–15 min |
| Sim create | trivial | s |
| Prepare | Read all typed entities from Zep, per-entity Zep edge/node searches + one profile-gen LLM call each (~30 entities, ThreadPool `max_workers=2` in places) | 2–6 min |
| Run | 30 agents × 6 rounds × **2 platforms** (client sends `platform:"parallel"`) — hundreds of agent LLM calls with memory context | 5–15 min |
| Report generate | Multi-step report agent over the timeline | 1–4 min |
| Fetch + transform | One gpt-4o call with up to ~58 KB of stuffed prompt | 30–60 s |
| Polling overhead | 5–10 s sleeps in every poll loop | ~1 min |

**Total cold: ~15–40 minutes.** NFR-1 is off by 3–8×. The single biggest and least controllable line is Zep Cloud's ingestion queue — on conference wifi, on a free/low tier, at an event where everyone else is also hammering shared SaaS.

**Failure scenario:** you click "Simulate" live at minute 1 of a 5-minute demo. At minute 5 the run-status still says round 2/6. Judges watch a spinner.

### Cheapest mitigation (in order of cheapness)

1. **Pre-run the entire full-mode simulation tonight.** The client already handles `reused`, `already_prepared`, `already_generated` — the chain is resumable by design. Demo shows the finished verdict + live persona chat (interview against the still-alive env). "Simulate" on stage = **triage mode**, which is one OpenAI pass and genuinely fits in the window.
2. If a live full run is non-negotiable: pre-warm through step 4 (ontology + graph + create + prepare keyed to the exact demo transcript + panel), and start live with `persona_count=8`, `max_rounds=2–3`, single platform (see Attack 2.4). That gets start→report into maybe 4–8 min. Still risky; rehearse with a stopwatch tonight and measure, don't hope.
3. Reduce polling sleeps (5–10 s each) to 2 s for the demo build. Free ~45 s.

Also: `_sim_prepare`, `_report_generate`, and `_poll_task` are **unbounded `while True` loops** (only `_wait_run` has a deadline). A stuck-but-healthy status endpoint hangs a FastAPI BackgroundTask forever and the run never transitions to `failed`. Add a deadline to all three — it's six lines.

---

## Attack 2 — MiroFish chain failure modes: the fallback story is half real

### 2.1 In-memory everything (verified)

`TaskManager` is a singleton with `_tasks: Dict[str, Task] = {}` (`app/models/task.py:56`). The simulation runner keeps `_run_states`, `_processes: Dict[str, subprocess.Popen]`, `_action_queues`, `_monitor_threads` as **class-level dicts** (`simulation_runner.py:228–231`). Flask restarts — crash, dev-reload from a stray file save, OOM — and every task id you're polling 404s, every subprocess handle is gone.

**Failure scenario:** you pre-warm at hour −3, someone touches a file in the MiroFish tree at hour −1 (dev server reloads), your pre-warmed `sim_id` still exists in project JSON but the live env and process handles are dead. Demo-time "chat with the churned persona" (`/api/simulation/interview` — requires LIVE OASIS env) returns 400.

**Mitigation:** after tonight's pre-run, treat the MiroFish process as radioactive: no code edits, no restarts, disable any auto-reload, `caffeinate` the laptop. Verify the interview endpoint responds 30 min before the demo. Persist `sim_id` + `agent_id`s in our DB now so the fallback (`interrogate.py` over stored event logs) is exercised **before** the demo, not discovered during it.

### 2.2 Zep Cloud is a hard, cloud-only dependency (verified)

`config.py` errors if `ZEP_API_KEY` is unset and **explicitly rejects `ZEP_API_URL`** — "MiroFish 仅连接 Zep Cloud". No self-host escape hatch. Graph build, prepare (entity reads + searches), and report all touch Zep. Rate limits, quota exhaustion on a free tier (each 500-char chunk = one billable episode; every new seed = a new graph), or venue-wifi flakiness kills the chain at its slowest step.

**Mitigation:** none that's cheap at T-12h except *not depending on it live* — which is mitigation 1 from Attack 1. Check your Zep quota/plan tonight; a mid-pre-run quota wall at 2 a.m. is the realistic way this bites.

### 2.3 The silent-hallucination hole — worst bug in the client

`_get_timeline` and `_get_profiles` **swallow `MiroFishError` and return `[]`** (`mirofish_client.py:208–219`). The transform then feeds gpt-4o an empty `TIMELINE` and asks it to produce personas, event logs, and drop-off "grounded" in it. gpt-4o will happily fabricate all of it. The run reports `completed`, the report looks great, and NFR-3 ("every number traceable to persona events") is quietly false. You would demo fiction and not know.

**Mitigation (cheap, do it):** in `simulate()`, if `timeline == []`, raise or set a visible degraded flag in `confidence_note`. Three lines. This is the difference between "graceful degradation" and "silent fraud."

### 2.4 The client contradicts its own docstring and pays 2× for it

Docstring: "single-platform sims never report 'prepared'; **narrow via platform= at start**." Code: `_sim_start` sends `platform: "parallel"` — both Twitter and Reddit run, roughly doubling agent LLM calls and run time for a demo that only needs one feed.

**Mitigation:** create with both platforms enabled (works around the upstream prepared-bug), start with `platform:"reddit"` only. One string. Halves Attack 1's run step and Attack 5's sim cost.

### 2.5 Does the fallback story hold?

Partially. **Triage mode**: yes — it's a single OpenAI pass, no MiroFish, no Zep, and it's already the implemented-first path. **Persona chat fallback**: only if 2.3 is fixed; otherwise the "stored event logs" backing `interrogate.py` may themselves be hallucinated. **Pre-recorded run**: only exists if you record it tonight — PRD hour 28–36 says "fallback recordings of every step"; that's now, not later.

---

## Attack 3 — The "listeners as entities" seed trick: three ways it breaks (verified against the extraction path)

How it actually works: prepare pulls **every** Zep node whose labels include anything beyond `Entity`/`Node` (`zep_entity_reader.filter_defined_entities`) and makes each one an agent (`oasis_profile_generator.generate_profile_from_entity`). Agent roster = whatever Zep's extraction typed, under an ontology that is itself **LLM-generated per run**. Nothing guarantees roster ≈ panel.

### Break 1: listeners collapse or fall through the filter

The 20 listener blocks are template-stamped near-duplicates — identical sentence, only `L00`→`L19` varies. Two independent killers:
- Zep entity resolution may **merge** near-identical descriptions into fewer nodes ("L00…L19" deduped or partially merged) → 30-persona panel becomes 7 agents.
- If the run's generated ontology has no type that matches "a listener," Zep labels them bare `Entity` → `filter_defined_entities` **drops them all** (labels-only-`Entity` nodes are skipped by design) → zero listener agents.

### Break 2: story characters become the audience

The beats section is rich narrative — named characters, relationships, repeated mentions. That's exactly what entity extraction is best at. The generated ontology will likely include a Character/Person type; those nodes pass the filter and become agents. **Failure scenario:** the "audience panel" simulating reception of the romance drama is 60% the drama's own characters posting about themselves on fake Reddit. The report's segment scores are then nonsense, and a judge who asks "who are these personas?" ends the demo.

### Break 3: count is uncontrollable in both directions

`persona_count` is a suggestion to a stochastic extractor. Cross-chunk mentions, the `> {text_span}` quotes (character names inside quoted prose), and the Critic blocks all add entities. You cannot promise "30-persona panel" (NFR-1's own framing) when agent count = f(LLM ontology, Zep extraction, chunking at 500 chars with overlap re-mentions).

### Cheapest mitigations

1. **Make listeners un-mergeable and un-missable:** give each a unique human name, age, city, occupation, one quirk ("Meena, 34, Kanpur, nurse, hates amnesia plots"). Distinct text defeats dedup and gives the profile generator real material. 20 minutes of prompt work in `_build_seed_markdown`.
2. **Steer the ontology:** the requirement string already goes into ontology generation — append "Define entity types: `Listener` (audience member), `Critic`. Story characters are fictional content, NOT participants; do not create entity types for them." Cheap, not guaranteed, but shifts the odds hard.
3. **Assert the roster before burning a run:** after prepare, fetch profiles, count entries matching `L\d\d`/listener names. If listeners < 0.5 × persona_count or story-character names appear as agents, abort and fall back (triage or the R2 direct-persona loop). Ten lines; converts a garbage 20-minute run into a 5-minute retry.
4. Consider fencing the prose: putting beats' `text_span` quotes behind a "SYNOPSIS (fictional content, not participants)" header costs nothing and may reduce character extraction.

---

## Attack 4 — Databricks mirror: mostly safe on paper, three ways it leaks into the live path

The design says no-op without env vars, mirror-only, never on the critical path. Fine. Where it still bites:

1. **The `PIPELINE=databricks` switch (hook 4).** It exists precisely so someone can flip local preprocessing to a *manual-trigger-only* (Free Edition) remote job. If that env var is set in the demo `.env` — say, left over from tonight's sponsor-dashboard testing — ingest now depends on workspace connectivity and a jobs API round-trip. **Mitigation:** delete the flag from the demo `.env` and grep for it in the startup log; better, make the code refuse `PIPELINE=databricks` unless an explicit `I_AM_NOT_THE_DEMO=1` is also set.
2. **Synchronous mirror pushes on the run path.** Hooks 2–3 push raw files to Volumes and verdicts to gold "after local processing." If `lakehouse.put_file` runs inside the same BackgroundTask thread as preprocessing/run completion, a hung SDK call (big upload, venue wifi) stalls the task and the UI poll sits in `processing` — the mirror just blocked the live path without ever being "on" it. And if an insert raises after run completion, does the run still transition to `done`? **Mitigation:** every lakehouse call gets `try/except: log`, a ≤5 s timeout, and fire-and-forget (own daemon thread). Enforce that `lakehouse.py` cannot raise past its own boundary — that's the whole contract.
3. **Opportunity cost.** Four notebooks + medallion tables + a SQL dashboard is real hours at T-12h, spent on a lane judges see for ~20 seconds. **Mitigation:** pre-populate `gold.verdicts`/`gold.dropoff_points` tonight with the pre-run's actual output and demo the dashboard as-is. Skip T2/T3 notebooks entirely if audio ingest isn't in the live script (NFR-6 already lets text carry the demo).

---

## Attack 5 — Cost per full run vs. NFR-2 (< $5)

Where the tokens actually go:

| Component | Model | Estimate |
|---|---|---|
| Our transform | **gpt-4o**, hard-coded (`mirofish_client.py:254`), prompt stuffed to ~58 KB chars (~15 K in / ~4 K out) | ~$0.08 — fine |
| MiroFish ontology + 30 profile gens + config | `LLM_MODEL_NAME`, **default gpt-4o-mini** | ~$0.10–0.30 |
| Simulation: 30 agents × 6 rounds × **2 platforms** (see Attack 2.4), each action an LLM call with memory context; plus report agent | same env var | mini: ~$0.5–2. **If anyone sets `LLM_MODEL_NAME=gpt-4o` "for quality": 15–40× → $10–40. NFR-2 dead.** |
| Zep Cloud ingestion | Zep's meter, not OpenAI's | ~25–35 episodes per unique seed; every panel tweak = new graph = new spend/quota. NFR-2 counts "OpenAI tokens" and silently ignores this bill. |

**Failure scenarios:** (a) someone quality-bumps the MiroFish model tonight and the "~$3 per run" demo line in the script becomes a lie a judge can catch; (b) three debugging re-runs of graph build exhaust the Zep tier before the demo; (c) `cost_tokens` is returned as a literal `0` from `simulate()` — the run-status UI advertises cost tracking (F3 "poll run status + cost") over a hard-coded zero, which is the same honesty problem as 2.3 in miniature.

**Mitigations:** pin `LLM_MODEL_NAME=gpt-4o-mini` in the demo env and comment why; single-platform start (2.4) halves sim cost; at minimum wire `resp.usage.total_tokens` from the transform call into `cost_tokens` so the number shown is nonzero and true-ish, or label it "external sim cost not metered"; reuse one seed/graph for all rehearsals (the `reused` flag exists — exploit it) to cap Zep burn.

---

## The 6-item T-12h punch list (everything above, by cost)

1. Fix the empty-timeline silent hallucination (3 lines) — Attack 2.3.
2. Start sim with one platform, not `"parallel"` (1 string) — halves time and cost.
3. Pre-run the full pipeline tonight on the demo transcript; freeze the MiroFish process; record everything.
4. Add deadlines to the three unbounded poll loops (6 lines).
5. Rewrite listener blocks with unique identities + ontology steering + post-prepare roster assert.
6. `try/except` + timeout around every lakehouse call; strip `PIPELINE=databricks` from the demo env; pre-load gold tables.
