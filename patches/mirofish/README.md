# MiroFish vendor patches (2026-07-26)

`vendor/MiroFish` is gitignored, so the patched files live here as full copies.
To apply on a fresh clone: copy each file over its counterpart in
`vendor/MiroFish/backend/` (paths below), then set the env vars.

| File | Destination | Patches ("# StoryCritic" markers) |
|---|---|---|
| run_reddit_simulation.py | scripts/ | start_hour window search; participation_rate; reasoning_effort passthrough; LLM timeout+retries; 600s round watchdog; platform-task death alarm |
| simulation_config_generator.py | app/services/ | start_hour + participation_rate defaults in TimeSimulationConfig |
| zep_entity_reader.py | app/services/ | AGENT_ALLOWLIST_REGEX entity filter (fixes 54-agents-from-18-listeners leak) |
| simulation_runner.py | app/services/ | read-repair: env "alive" heartbeat -> completed status (reddit runner never writes actions.jsonl and never exits); OASIS-db fallback for actions/timeline |

Env (in `vendor/MiroFish/backend/.env` locally, Railway variables in prod — values not stored here):

    LLM_MODEL_NAME=gpt-5.6-luna
    LLM_REASONING_EFFORT=none
    AGENT_ALLOWLIST_REGEX=(?i)^(?:(?:listener\s+)?[A-Za-z]+-L\d{2}|(?:critic\s+)?(?:pacing\s+analyst|story\s+editor))\s*$
    LLM_TIMEOUT_S=120            # optional, defaults to 120 in the patch
    LLM_API_KEY=<openai key>
    ZEP_API_KEY=<zep key>

Deploy: `cd vendor/MiroFish && railway up --service mirofish` (Dockerfile.railway
already at vendor/MiroFish/, copied from deploy/mirofish/).

Root-cause history: the swarm always completed in seconds-to-minutes; every
"30-minute hang" was the status lifecycle (runner stays alive for interviews,
monitor reads a file the reddit runner never writes). See docs/AUTH-AUDIT.md
sibling reports and the session memory for the full chain of diagnosis.
