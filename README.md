# StoryCritic

**The market's opinion, not a critic's.** Upload a story — script, transcript, audio, or video — pick the audience you care about, and a swarm of simulated Pocket FM listeners tells you *before production spend* whether it works: score /10, pros, cons, predicted drop-off points, prioritized fixes.

Built in 36 hours for Pocket FM's **Zero to One** Generative Media Hackathon (OpenAI × Lightspeed, IIM Bangalore, July 2026).

## How it works

```
upload → preprocess → pick audience panel → swarm simulation → segmented verdict
```

1. **Ingest** any format: text/PDF paste-or-drop; audio/video → ffmpeg → ElevenLabs Scribe v2 (Hindi ASR + diarization) → normalized Story Representation (beats, hooks, cliffhangers)
2. **Panel**: preset Pocket FM listener archetypes or custom (market, language, genres, habits)
3. **Simulate**: [MiroFish](https://github.com/666ghj/MiroFish) (OASIS/CAMEL-AI swarm) — each panel listener becomes an agent with memory, reacting beat by beat
4. **Verdict**: score, drop-off curve with paywall-risk cliffs, per-segment scores ("8/10 romance fans, 4/10 thriller fans"), fixes with estimated impact — then *chat with the listener who churned at minute 7*

**Hard principle: validates content, never the creator.** No writer identity enters the pipeline; the storage schema has no author column anywhere (it's a test: `backend/tests/test_e2e.py::test_no_author_columns`).

## Quickstart

```bash
# API (mock mode = no keys needed)
cd backend && uv sync && DEMO_MOCK=true uv run uvicorn app.main:app --port 8000

# UI
cd frontend && npm install && npm run dev    # → http://localhost:5173

# tests
cd backend && uv run pytest -q
```

Full swarm mode additionally needs MiroFish running (`vendor/`, see `RUNBOOK.md`) plus OpenAI + Zep keys.

## Repo map

| Path | What |
|---|---|
| `backend/` | FastAPI — ingest, panels, runs, verdict, chat, export (`ARCHITECTURE.md` inside) |
| `frontend/` | React wizard — upload → panel → verdict → persona chat |
| `backend/ETL-DATABRICKS.md` | Lakehouse pipeline design (Volumes/Delta/Jobs) |
| `RUNBOOK.md` | Demo boot, pre-run checklist, 5-min script, failure drills |
| `assets/` | Ep 02 Hindi transcript (demo input) |
| `_bmad-output/` | Market research, PRD, review trail |
| `docs/superpowers/specs/` | Superseded "Become the Hero" spec (voice-swap concept) |
