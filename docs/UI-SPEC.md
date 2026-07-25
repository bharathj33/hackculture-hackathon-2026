# StoryCritic — UI & Functionality Spec

Hand this to a designer/Claude session to design or rebuild the UI. Backend contract is frozen; everything here is implemented and running.

## Product in one line

Internal tool for Pocket FM's editorial team: upload a story (script / transcript / audio / video), pick a simulated audience panel, and get a **market's verdict** — score /10, predicted drop-off curve, per-segment scores, prioritized fixes — plus the ability to *chat with the simulated listeners* about why they quit.

**Brand voice:** "The market's opinion, not a critic's."
**Hard principle (must appear in UI):** "Validates content, never the creator." No writer names, no author fields, no creator history anywhere.

## Users & context

- Primary user: editorial reviewer triaging a submission queue. Wants a defensible greenlight/fix/reject signal in minutes.
- Demo context: 5-minute hackathon pitch on a laptop + projector. Dark theme, big numbers, readable from distance.
- Single user, no auth, no accounts.

## Information architecture

Single-page wizard, 4 steps + overlay drawer:

```
[1 Upload] → [2 Panel] → [3 Simulate] → [4 Verdict]
                                          └── Chat drawer (overlay)
```

Stepper always visible top-right; completed steps green, active step highlighted.

---

## Screen 1 — Upload

**Purpose:** get any story format in; show the system *understood* the story.

- Two tabs: **Upload file** (drag-drop zone; .txt .md .pdf .mp3 .wav .m4a .mp4) and **Paste text** (textarea).
- Submit → processing state: spinner + "Extracting beats, hooks and cliffhangers…" (text) / "Transcribing audio…" (audio/video, takes longer).
- **Success state = beats preview** (the first "wow"): list of extracted beats — `#idx · Ep N`, one-line summary, badges `HOOK` (green) and `CLIFFHANGER` (red/amber). Header: "Story ingested — N beats · language: hi".
- Actions: **Start over** · **Choose audience panel →**
- Errors: parse/transcription failure → message + retry. Empty input blocks submit.

## Screen 2 — Panel

**Purpose:** creator picks *who* judges. This is a core differentiator — make it feel like casting an audience, not picking a config.

- Grid of **preset panel cards**: name (e.g. "Tier-2 Hindi romance binge-listener"), `PRESET` badge, persona count, market (IN/US), language, genre chips. Selected card gets accent border.
- Mode toggle: **Full** (swarm simulation, minutes) vs **Triage** (quick pass, ~30s). Default Full; demo uses Triage live.
- **Backtest** checkbox (runs against published content for credibility framing).
- Optional (stretch, not built): custom panel builder — demographics, genres, habits, persona count slider.
- Actions: **← Back** · **Simulate** (disabled until panel selected).

## Screen 3 — Simulate (running)

**Purpose:** hold attention during the wait; suggest the swarm working.

- Status pill: queued → running. Poll every 3s, 10-min cap → timeout error + Retry / Back.
- Nice-to-have: rotating status lines ("Panel is listening to episode 1…", "Neha-L08 reached the cliffhanger…") — theatrical, personas are real.
- Ghost "← Back to panels" always available.
- Failure → error box + Retry (re-creates run) + Back. Note: full mode auto-falls back to triage server-side; UI just sees a completed run.

## Screen 4 — Verdict (the money screen)

Layout top to bottom:

1. **Hero score**: huge N.N/10, color-coded — red <5 ("Needs rework"), amber 5–7 ("Fixable"), green >7 ("Greenlight material") — with verdict label + 2-3 sentence rationale. Right rail buttons: **Ask the audience** (opens chat drawer) · **Export report** (downloads markdown) · **New story**.
2. **"Where listeners drop off"** — line chart, retention % (y, 0-100%) vs story beat (x). Red dots = cliffs (tooltip shows cause). Amber ring + "PW" label = paywall-conversion risk (cliffs in episodes 1–10 cost money, not just retention). Legend below.
3. **Segment scores** — horizontal bars per audience group ("Daily Commute Listeners 9.0", "Binge Listeners 8.0") with n= counts. This sells "market's opinion, not a critic's".
4. **Pros / Cons** — two columns; each item traceable (may carry persona_refs like "Amit-L07").
5. **Priority fixes** — numbered list, each with estimated impact ("+1.0 score with romance segment").
6. **Confidence footer** (muted, always present): forecast-not-ground-truth disclaimer. Never hide this — honesty is a feature.

## Chat drawer (overlay from Verdict)

**Purpose:** the demo "wow" — interrogate the audience.

- Left rail: persona list — name/group label + badge "dropped @ beat N" (red) or "finished" (green); plus **Report Agent** entry ("Ask about the verdict").
- Right: per-persona message thread. Editor asks ("why did you stop at beat 3?"), persona answers in character, grounded in its simulation event log.
- Input: Enter sends (IME-safe), Send button, disabled while awaiting reply.

---

## API contract (frozen — localhost:8000, proxy /api)

| Call | Returns |
|---|---|
| `POST /api/ingest/text {text}` / `POST /api/ingest/file` (multipart) | Submission `{id, status, story_rep}` |
| `GET /api/ingest/{id}` | poll until `status: ready` — `story_rep.beats[]: {idx, summary, episode, is_hook, is_cliffhanger}`, `characters[]`, `language` |
| `GET /api/panels` | `[{id, name, is_preset, config: {persona_count, market, language, genre_affinities[], habits[]}}]` |
| `POST /api/runs {submission_id, panel_id, mode: full\|triage, backtest}` | Run `{id, status}` |
| `GET /api/runs/{id}` | poll until `done`/`failed`; has `cost_tokens` |
| `GET /api/runs/{id}/report` | `{score, rationale, pros[{text, persona_refs[]}], cons[…], dropoff[{beat_idx, retained_pct, cliff, cause, paywall_risk}], segments[{group, score, n}], fixes[{priority, text, est_delta}], confidence_note}` |
| `GET /api/runs/{id}/personas` | `[{id, group_label, profile, dropped_at_beat}]` |
| `POST /api/runs/{id}/chat {message, persona_id?}` | `{role, content}` — persona_id null = report agent |
| `GET /api/runs/{id}/chat` | history |
| `GET /api/runs/{id}/report/export` | markdown feedback packet (download) |

Timing expectations: ingest text ~8–15s, audio ~30–90s; triage run ~10–30s; full run = minutes (poll patiently).

## States every screen must handle

processing / ready / failed on ingest · queued / running / done / failed on runs · fetch errors with retry · 10-min poll timeout · empty states. Global ErrorBoundary (crash → message + reload, never white screen).

## Design directives

- Dark theme, projector-legible; hero score readable from 5m.
- Hindi text (Devanagari) appears in beats/quotes — pick fonts accordingly.
- Color system: accent indigo/violet; success green, warn amber, danger red used ONLY for meaning (score bands, cliffs, badges).
- Charts: no chartjunk; the drop-off curve is the single most important visual — cliff annotations must survive projection.
- Footer on every screen: "Validates content, never the creator."
- Nothing anywhere asks for or displays a writer's name. If a design idea needs an author field, the idea is wrong.

## Out of scope

Auth/accounts, writer-facing views, per-writer history, mobile layout (desktop demo only), custom panel builder (stretch).
