# StoryCritic agent allowlist — Railway deploy step

`railway.json` here carries only build/deploy config (no env section), so the
`AGENT_ALLOWLIST_REGEX` variable must be set on the Railway service directly.
Run this once against the MiroFish service (single quotes are required — the
value contains `\d`, `\s`, `$`, `?`, `(` which the shell would otherwise eat):

```bash
railway variables --set 'AGENT_ALLOWLIST_REGEX=(?i)^(?:(?:listener\s+)?[A-Za-z]+-L\d{2}|(?:critic\s+)?(?:pacing\s+analyst|story\s+editor))\s*$'
```

Then redeploy (setting a variable triggers a redeploy prompt; accept it or run
`railway up`).

## What it does

MiroFish's `ZepEntityReader.filter_defined_entities` (patched, marked
`# StoryCritic`) drops every extracted entity whose name does not match this
regex before any agent ids exist — so only the 16 seeded listeners
(`Asha-L00`..`Arjun-L15`) and the 2 critics (`Pacing analyst`, `Story editor`)
become simulation agents, instead of 46-54 agents including story characters,
cities, and abstract nouns.

- Unset/empty variable = original MiroFish behavior (no filtering).
- Regex matching 0 entities = loud warning in logs, run proceeds UNFILTERED
  (never an empty swarm).
- Simulations prepared BEFORE the variable was set keep their old
  `reddit_profiles.json` / `simulation_config.json`; re-prepare with
  `force_regenerate: true` to apply the allowlist.
