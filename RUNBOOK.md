# StoryCritic — Demo Runbook

## Boot (3 terminals)

```bash
# T1 — MiroFish (only needed for full-swarm mode)
cd vendor/MiroFish/backend && uv run python run.py            # :5001

# T2 — API
cd backend && uv run uvicorn app.main:app --port 8000        # :8000  (DEMO_MOCK=true for keyless rehearsal)

# T3 — UI
cd frontend && npm run dev                                    # :5173
```

## Keys

| File | Keys |
|---|---|
| `backend/.env` | `OPENAI_API_KEY`, `ELEVENLABS_API_KEY` (audio path only) |
| `vendor/MiroFish/backend/.env` | `LLM_API_KEY` (=OpenAI key), `LLM_BASE_URL=https://api.openai.com/v1`, `LLM_MODEL_NAME=gpt-4o-mini`, `ZEP_API_KEY` |

No keys? `DEMO_MOCK=true` on the API → whole wizard works with canned verdict.

## Demo asset

`assets/ep02_transcript_hi.txt` — Pocket FM Ep 02 Hindi transcript (YouTube captions, 16.8k chars). Paste into the upload textarea.

## Modes

- **triage** — one LLM pass, ~30-60s, the LIVE on-stage run
- **full** — MiroFish swarm, 15–40 min cold (Zep graph build dominates). **Pre-run the night before**; cached verdict shown on stage. If full mode dies mid-run it auto-falls back to triage (NFR-6)

## Pre-run outcome (Jul 26, 01:00–01:30)

What actually happened, and the honest demo assets it produced:

| Asset | Status | Demo use |
|---|---|---|
| **Triage verdict on Ep 02** | ✓ REAL — 8.7/10, run `63bc0518f932421e96a9eae3e32222ad` | the LIVE on-stage run (~1 min, reproducible) |
| **Zep knowledge graph** from Ep 02 + panel | ✓ built (project in MiroFish UI :3000) | show graph screen — "story + audience as a knowledge graph" |
| **Persona generation** | ✓ REAL — panel listeners became agents with rich profiles (Neha-L08, Pooja-L06, Sanjay-L05…) matching panel config | screenshot/show `reddit_profiles.json` — the swarm exists |
| **MiroFish report** (report agent over graph) | see report_7fad22fa8796 | deep-report slide, honestly labeled |
| **Full swarm rounds** | ✗ OASIS subprocess wedges ~64K output on this machine (known issue, manager AND manual runs) | say honestly: "swarm rounds hit a local runtime bug; architecture is wired end-to-end — graph, personas, interview API, report agent all live" |

Known leak to mention if asked: story characters also became agents alongside panel listeners (entity extraction is greedy) — filter by `-LNN` suffix is the post-hackathon fix.

## Tonight's pre-run checklist (once keys in)

1. `cd backend && uv run uvicorn app.main:app` (real keys, no DEMO_MOCK)
2. Ingest Ep 02 transcript via UI → wait ready (real beats this time)
3. Start run mode=**full**, panel=Tier-2 Hindi romance → walk away (≤40 min)
4. Verify report renders; note run_id; chat with 1–2 personas WHILE MiroFish process still alive (live interview dies with the process)
5. Screen-record every step as fallback footage
6. Do NOT restart MiroFish Flask after the run — task state is in-memory

## 5-minute demo script (from PRD §9)

1. Cold open: "Pocket FM learns a story failed after $2,400. We move that moment to before rupee one."
2. Paste Ep 02 transcript → beats preview (hooks/cliffhangers badged)
3. Panel: Tier-2 Hindi romance → Simulate (triage, live ~1 min); narrate over the wait
4. Verdict: score → drop-off cliff → segmented scores ("8/10 romance, 4/10 thriller")
5. Switch to pre-run FULL verdict → chat with the churned persona — the wow beat
6. Honesty note (confidence footer) + close on money: "~$3 a run vs $2,400 a pilot vs a lost 1B-play franchise"
7. Scripted answer to "can we run ours?": "Give us 5 episodes, we predict drop-off blind — that back-test is the pilot"

## At the venue — ask mentors

- Q2: real listener archetypes for panel presets
- Q3: one real episode retention curve (upgrades back-test slide to predicted-vs-actual)
- Q1: hackathon IP terms

## Failure drills

| Symptom | Move |
|---|---|
| MiroFish chain hangs | runs auto-timeout (15 min bounds) → triage fallback kicks in |
| OpenAI down | DEMO_MOCK=true, restart API, demo proceeds canned |
| UI white-screen | ErrorBoundary shows reload; worst case play fallback recording |
| Judges' wifi | everything is localhost — no external dependency except LLM APIs |
