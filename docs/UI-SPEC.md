# StoryCritic — Feature & Functionality Spec (UI open)

Hand this to a designer/Claude session. **The screen structure, layout, and flow are yours to invent** — this doc defines what the product does, what data exists, and what must hold true. A 4-step wizard exists today as a reference implementation (`frontend/`), but do not treat it as the required shape.

## Product

Internal tool for Pocket FM's editorial team: submit a story in any form (script / transcript / audio / video), choose a simulated audience, and receive **the market's verdict** — a score out of 10, predicted listener drop-off across the story, per-audience-segment scores, pros/cons, and prioritized fixes — then **interrogate the simulated listeners** about their reactions.

**Brand voice:** "The market's opinion, not a critic's."
**Non-negotiable principle (must be felt in the UI):** *Validates content, never the creator.* No writer names, author fields, or creator history exist anywhere in the product. If a design needs an author field, the design is wrong.

## Who uses it, where

- Editorial reviewer triaging a submission funnel; needs a defensible greenlight / fix-and-resubmit / reject signal in minutes, with evidence they can show in a meeting.
- Demo context: 5-minute hackathon pitch, laptop + projector, dark room. Key numbers must read from distance. Desktop only. Single user, no auth.

## Capabilities (what the user can do)

1. **Submit a story** — paste text, or upload .txt/.md/.pdf/.mp3/.wav/.m4a/.mp4. System normalizes everything into a **Story Representation**: sequential beats with summaries, episode numbers, and detected HOOK / CLIFFHANGER flags, plus characters and language. Showing this back to the user is powerful — it proves the system *understood* the story. Hindi (Devanagari) content is normal.
2. **Cast an audience** — choose who judges. Preset panels exist (e.g. "Tier-2 Hindi romance binge-listener", "US thriller commuter") each with persona count, market, language, genre affinities, listening habits. This choice is a core differentiator — it should feel like casting an audience, not editing config. (Custom panel building = stretch, API supports saving.)
3. **Run a simulation** — two depths: **Triage** (~10–30s, quick pass) and **Full** (swarm simulation, minutes; server auto-degrades to triage on failure). Optional **backtest** flag frames a run against published content. Waiting is real — design for it (the personas genuinely exist; theatrical progress is legitimate).
4. **Read the verdict** — the money moment. Available data:
   - score /10 + short rationale (suggested meaning bands: <5 rework, 5–7 fixable, >7 greenlight)
   - **drop-off prediction**: retention % per story beat, with flagged cliffs (each has a cause) and **paywall-risk** markers (cliffs in episodes 1–10 cost revenue, not just attention — Pocket FM's coin economy converts on early episodes)
   - **segment scores**: per audience group with sample sizes ("romance fans 8.0 (n=12), thriller fans 4.2 (n=8)") — this is the "market's opinion" made visible
   - pros and cons, each traceable to named personas ("Amit-L07")
   - prioritized fixes with estimated impact ("+1.0 score with romance segment")
   - a **confidence note** — forecast-not-ground-truth disclaimer. Must always be visible; honesty is a feature, not fine print.
5. **Interrogate the audience** — converse with any individual persona (they answer in character, grounded in their simulated experience; each knows where/why it dropped off or that it finished) or with a **report agent** for aggregate questions ("what single change lifts the thriller segment most?").
6. **Export** — one-click writer-facing feedback packet (markdown download; contains no internal/cost data).
7. **Start over** — new story, fresh run, no residue.

## Data & API (frozen — localhost:8000, dev proxy `/api`)

| Call | Returns |
|---|---|
| `POST /api/ingest/text {text}` · `POST /api/ingest/file` (multipart) | Submission `{id, status, story_rep}` |
| `GET /api/ingest/{id}` | poll to `ready` — `story_rep.beats[]: {idx, summary, episode, is_hook, is_cliffhanger}`, `characters[]`, `language` |
| `GET /api/panels` | `[{id, name, is_preset, config: {persona_count, market, language, genre_affinities[], habits[]}}]` |
| `POST /api/runs {submission_id, panel_id, mode: full\|triage, backtest}` | Run `{id, status}` |
| `GET /api/runs/{id}` | poll to `done`/`failed`; includes `cost_tokens` |
| `GET /api/runs/{id}/report` | `{score, rationale, pros[{text, persona_refs[]}], cons[…], dropoff[{beat_idx, retained_pct, cliff, cause, paywall_risk}], segments[{group, score, n}], fixes[{priority, text, est_delta}], confidence_note}` |
| `GET /api/runs/{id}/personas` | `[{id, group_label, profile, dropped_at_beat}]` |
| `POST /api/runs/{id}/chat {message, persona_id?}` | `{role, content}` — `persona_id: null` = report agent |
| `GET /api/runs/{id}/chat` | thread history |
| `GET /api/runs/{id}/report/export` | markdown (trigger download) |

Timing: text ingest 8–15s · audio 30–90s · triage 10–30s · full = minutes. All long operations are poll-based — design the waits.

## Truths the design must respect

- Every async state is real and must be handled: processing/ready/failed, queued/running/done/failed, fetch errors, long-poll timeouts, empty states. Never white-screen (crash → recoverable message).
- The drop-off curve is the single most information-dense artifact — whatever form it takes (chart, timeline, strip, annotated beats), cliff causes and paywall-risk must survive a projector.
- Persona names/quotes recur across verdict, pros/cons, and chat — treat personas as first-class characters of the product, not metadata.
- Confidence note always visible with the verdict.
- The principle line ("Validates content, never the creator.") should live somewhere persistent.
- Dark, projector-legible; Devanagari + Latin mixed text; color carries meaning only (score bands, cliffs, hooks).

## Design direction (owner preference)

**Dashboard-style, not wizard-style.** Think editorial command center / analytics console rather than a step-by-step form:

- Verdict data as a dashboard: hero score tile, drop-off chart panel, segment-score tiles, fixes list, persona rail — dense, glanceable, panel-based layout.
- Submission + panel selection can be compact controls (side rail, top bar, or modal) feeding the dashboard rather than full-screen steps.
- Multiple runs/stories visible or switchable is welcome (run history exists in the API via ids; a recent-runs rail is fair game).
- Reference aesthetics: Databricks/Grafana-class analytics surfaces, dark, KPI tiles + charts — but with the product's editorial personality (personas as characters, story beats as narrative objects, not just rows).
- Everything else above (states, truths, principle line) still applies.

## Out of scope

Auth/accounts · writer-facing surfaces · per-writer anything · mobile · realtime collaboration.
