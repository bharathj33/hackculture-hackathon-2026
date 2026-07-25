# StoryCritic — PRD Addendum (technical-how & preserved depth)

Downstream material that doesn't belong in the PRD proper. For architecture/dev phases.

## Engine: MiroFish integration notes

- Repo: https://github.com/666ghj/MiroFish — AGPL-3.0, ~69k stars, backed by Shanda Group
- Stack: Node 18+ frontend (port 3000), Python 3.11–3.12 backend (port 5001), uv package manager; `npm run setup:all` → `npm run dev`; Docker Compose available
- Pipeline: document upload → LLM ontology extraction → knowledge graph (GraphRAG) → entity filtering → persona generation → OASIS dual-platform simulation (Twitter+Reddit-style) → graph memory updates → report agent → interactive chat
- Simulation engine: OASIS by CAMEL-AI
- Config needs: LLM API key (README recommends Qwen-plus; we point at OpenAI hackathon credits), Zep Cloud key (agent memory)
- **Known mismatch (R2):** MiroFish's seed model is shaped for news/scenario prediction and social-media reaction. Our adaptation: story = "event stream" fed beat-by-beat; personas = listeners not tweeters. If the dual-platform social frame distorts results, fallback is direct OASIS/CAMEL usage with custom listener-persona prompts and a beat-sequenced exposure loop.

## Preprocessing stack (from prior voice-swap research, reused)

- ASR + diarization primary: ElevenLabs Scribe v2 (Hindi-strong); A/B: Sarvam saaras:v3; open backup: pyannote + WhisperX (known overlapping-speech weakness)
- Video: ffmpeg audio extraction → ASR path
- Narrator trap (from prior spec): Pocket FM often uses one narrator voicing all characters — diarization may return one speaker; Story Representation must not depend on speaker count

## Frontend/backend choice

[ASSUMPTION] Fork MiroFish's existing web UI where possible rather than greenfield; custom screens needed: upload/ingest, panel builder, verdict report (score, drop-off timeline, segments), packet export. Timeline chart: any lightweight chart lib; drop-off curve = retention % vs story beat index.

## Rejected alternatives

- **Single-LLM critic (GPT-5 "act as editor" prompt):** rejected as the core — it's what every Cluster-A competitor does; kept as the cheap "triage mode" tier (NFR-2)
- **Real human beta-reader panel:** days of latency, unscalable to funnel
- **Fine-tuning a scoring model on hit/flop data:** no access to labeled corpus in 36h; is the correct post-hackathon calibration path
- **Seed-VC/RunPod voice pipeline:** belonged to the superseded voice-swap concept; only the ASR research carries over

## Market data snapshot (full citations in research doc)

- Pocket FM: 300k creators (2025) → 1M target (2026); 90% first-timers; creator economy ₹300cr → ₹1,000cr target
- Pilot economics: ~$2,400/episode test pilots vs $40k industry norm; seconds-level drop-off analytics post-hoc; 85% series-finish once 10+ episodes unlocked
- India micro-drama market: $1.5B (2026) → $6.5B (2033), 29% CAGR
- Competitor clusters: author-critique AI (Marlowe, ProWritingAid), Hollywood analytics (ScriptBook, StoryFit, Vault), synthetic audiences (Ask Rally, Socialtrait, ScriptSooth), rival platforms (Kuku FM, Pratilipi). Category intersection unoccupied.

## Demo asset

- Pocket FM Hindi drama Ep 02, YouTube `lAIV5Qhld2Q` (from the superseded spec; download noted as done there — verify `assets/` exists)
- Back-test honesty framing: we lack Pocket FM's internal retention curve; overlay predicted curve against public signals (play counts, episode popularity) and label accordingly
