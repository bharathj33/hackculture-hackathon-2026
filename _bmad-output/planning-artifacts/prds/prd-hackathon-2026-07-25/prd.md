---
title: "StoryCritic — Audience-Swarm Content Critique for Pocket FM Editorial"
status: final
created: 2026-07-25
updated: 2026-07-25
---

# StoryCritic — Audience-Swarm Content Critique

**One-liner:** Upload a story (script, transcript, audio, or video), pick the audience you care about, and a swarm of simulated Pocket FM listeners tells you — before you spend a rupee on production — whether it works: score out of 10, pros, cons, predicted drop-off points, and prioritized fixes.

**Context:** Built in 36 hours for Pocket FM's "Zero to One" Generative Media Hackathon (OpenAI + Lightspeed, IIM Bangalore, July 25–26 2026). Full market analysis: [market research doc](../../research/market-ai-story-critique-for-audio-drama-creators-research-2026-07-25.md).

---

## 1. Vision & Problem

Pocket FM's content pipeline learns whether a story works only **after** money is spent: pilots cost ~$2,400/episode and drop-off analytics are post-publication. Meanwhile the submission funnel (300k+ writers, targeting 1M) grows faster than human editorial capacity ever can. Every existing feedback tool gives *a critic's opinion* — one LLM playing editor.

StoryCritic gives *the market's opinion*: a MiroFish-powered swarm of heterogeneous listener personas simulates audience reaction to the story itself. The score is a forecast, not a vibe. The editorial team gets greenlight/fix/reject decision support **before production spend**; writers get concrete, content-specific feedback instead of silent rejection.

**Pitch line:** Pocket FM already ships AI for *generation* — Planner, Context, and Drama agents used by 300k creators. Nothing in the stack does AI *evaluation*. StoryCritic completes the loop: AI writes, AI-simulated audiences judge, humans decide.

**The error is asymmetric — and both sides are expensive.** A wrong greenlight burns that ~$2,400 pilot spend plus production and promotion. A wrong rejection silently loses a potential 1B-play franchise. Today's tooling prices neither before publication. Drop-off is also a *revenue* event, not just retention: listeners who unlock 10+ episodes finish a series 85% of the time — early-episode quality is the paywall-conversion gate in the coin economy.

**"Why not just prompt GPT?"** That single-LLM critic is a commodity (and our cheap triage mode). The moat is the *audience model*: N heterogeneous personas with memory reacting beat-by-beat — and post-hackathon, calibration of those personas against Pocket FM's proprietary seconds-level drop-off ground truth, data no external vendor has. Precedent says this works: ScriptSooth tests ad scripts on synthetic audiences pre-shoot; synthetic panels report 80–95% agreement with human panels; ScriptBook claims 86–87% box-office forecast accuracy.

**Product principle (hard constraint): validates content, never the creator.** The unit of judgment is one submitted story artifact. No writer identity enters the pipeline; no per-writer aggregation, scoring history, or ranking exists anywhere in the product. Same writer, two stories, independent verdicts.

## 2. Users

Single operator role (internal tool):

- **Primary — Editorial/content-ops reviewer at Pocket FM.** Faces a submission queue; needs a fast, defensible, explainable triage signal. Values human-in-the-loop (Pocket FM's stated AI doctrine): the tool recommends, the editor decides.
- **Secondary (indirect) — Contracted writer.** Never touches the tool; receives the exported feedback packet through the editorial team.
- **Hackathon-day — Judges** (Pocket FM leadership, OpenAI, Lightspeed). The demo must read in under 5 minutes and end on money.

## 3. User Journey (UJ-1: the editor)

Priya, an editorial reviewer, gets a new Hindi romance submission. She drags the script PDF into StoryCritic, picks the "Tier-2 Hindi romance binge-listener" preset panel (30 personas), and hits Simulate. Four minutes later: **6.8/10**. The drop-off timeline shows a cliff at the episode-2 midpoint — the panel found the love-triangle reveal predictable; thriller-leaning personas left earliest. She opens the chat and asks a churned persona "why did you stop?" — "I guessed the twist in episode 1; nothing new was promised." She exports the feedback packet (score, segmented breakdown, top-3 fixes) and sends it back to the writer with a revise-and-resubmit instead of a rejection. Decision made in minutes, with evidence she can defend in the greenlight meeting.

## 4. Features & Functional Requirements

### F1 — Multi-modal ingest
- **FR-1.1** Accept text upload: plain text, markdown, PDF script/transcript (paste or file).
- **FR-1.2** Accept audio upload (mp3/wav/m4a): transcribe + diarize via ElevenLabs Scribe v2 → speaker-attributed transcript.
- **FR-1.3** Accept video upload (mp4): extract audio track (ffmpeg) → FR-1.2 path.
- **FR-1.4** Normalize all inputs into one **Story Representation**: episode/scene beats, characters, dialogue/narration split, detected hooks and cliffhangers. *Done when:* output validates against a fixed schema (≥1 beat, each beat carries a source-text span; hooks/cliffhangers tagged with beat references) and the demo transcript produces a stable golden-file representation.
- **FR-1.5** Strip/ignore any author-identifying metadata on ingest (filename, PDF author field, byline) — content-not-creator constraint enforced at the door.

### F2 — Panel selection
- **FR-2.1** Preset panels modeled on Pocket FM listener archetypes (e.g. Tier-2 Hindi romance binge-listener; US thriller commuter; genre superfan; casual sampler). [ASSUMPTION: 4 presets sufficient for demo; production would calibrate from real listener data]
- **FR-2.2** *(Stretch — first de-scope candidate; presets alone carry the demo)* Custom panel builder: demographics, language/market, genre affinities, listening habits; panel size selectable. [ASSUMPTION: 10–30 personas per run balances signal vs cost/latency]
- **FR-2.3** Optional critic archetypes addable to a panel (developmental editor, platform content reviewer) — clearly labeled as critics, not audience.
- **FR-2.4** Panel config is saved and reusable across runs.

### F3 — Swarm simulation (MiroFish engine)
- **FR-3.1** Feed Story Representation + panel config to MiroFish: GraphRAG knowledge-graph build → persona generation constrained by panel config → OASIS simulation of listening/reaction.
- **FR-3.2** Personas react episode-by-episode/beat-by-beat with memory — supports mid-story churn, not just end verdicts.
- **FR-3.3** Simulation produces per-persona event log: continued/dropped (where, why), emotional reactions, share/recommend intent.
- **FR-3.4** LLM backend: OpenAI (hackathon credits); agent memory: Zep Cloud.

### F4 — Verdict report
- **FR-4.1** Overall score /10 with one-paragraph rationale.
- **FR-4.2** Pros (what lands) and cons (what fails), each traceable to persona reactions.
- **FR-4.3** **Drop-off timeline**: predicted retention curve over story beats, cliff points annotated with cause. Cliffs in episodes 1–10 are flagged as **paywall-conversion risks** (revenue framing, not just retention).
- **FR-4.4** **Segmented scores** by persona group ("8/10 romance fans, 4/10 thriller fans").
- **FR-4.5** Prioritized improvement list (top 3–5), each tied to a predicted retention/score delta. [ASSUMPTION: delta estimates are directional, labeled as such]
- **FR-4.6** Exportable feedback packet (markdown/PDF) suitable for sending to the writer — contains zero simulation-cost or editorial-internal data.

### F5 — Interrogation (chat with the audience)
- **FR-5.1** Chat with any individual persona post-simulation ("why did you stop at minute 7?") via MiroFish deep-interaction.
- **FR-5.2** Chat with the report agent for aggregate questions ("what single change lifts the thriller segment most?").

### F6 — Back-test mode (credibility)
- **FR-6.1** Run the simulator on a published episode and display the predicted drop-off curve overlaid against **available public signals** (play counts, episode-level popularity), explicitly labeled "public signals — not internal retention data." For demo: Pocket FM episode transcript (Ep 02 asset, YouTube lAIV5Qhld2Q). True predicted-vs-actual overlay becomes possible only if Pocket FM mentors share a real retention curve at the event (ask — see Q3).
- **FR-6.2** Every report displays a confidence note: simulation is a forecast with error bars, not ground truth.

## 5. Non-Functional Requirements

- **NFR-1** End-to-end run (text input, 30-persona panel) completes in **≤ 5 minutes** — demo constraint.
- **NFR-2** Cost per full simulation run **< $5** in OpenAI tokens; a cheap single-pass "triage mode" exists for funnel-scale use. [ASSUMPTION]
- **NFR-3** Explainability: every number in the report must be traceable to persona events — no bare scores.
- **NFR-4** Privacy/ethics: no writer PII stored or processed (FR-1.5); uploaded content stays local/session-scoped; demo content is Pocket FM's own IP used at Pocket FM's own hackathon.
- **NFR-5** License: MiroFish is AGPL-3.0 — acceptable for hackathon/internal use; flag for legal review before any commercial distribution.
- **NFR-6** Graceful degradation: if audio/video ingest fails live, text path must still carry the full demo.
- **NFR-7** Persistence model (reconciles FR-2.4 with NFR-4): uploaded story content is session-scoped and deleted after the run; **persisted** artifacts are panel configs, verdict reports, and run records keyed by a content hash. The storage schema contains **no author/writer field anywhere** — this is what makes the "no per-writer aggregation" audit mechanically checkable.

## 6. Scope — 36-Hour Plan

**Hour 0–8 (spine):** text ingest → Story Representation → MiroFish integration → raw verdict JSON. *Milestone: one real transcript through the full pipe.*
**Hour 8–20 (product):** panel selection UI, verdict report UI (score, pros/cons, drop-off timeline, segments), persona chat. *Milestone: demo-able end-to-end.*
**Hour 20–28 (moat):** back-test view; feedback-packet export; audio ingest (ElevenLabs). *Milestone: credibility slide works.*
**Hour 28–36 (polish):** video ingest (ffmpeg, thin); demo script rehearsal; fallback recordings of every step.

**Out of scope (say no):** writer-facing accounts/portal, per-writer analytics (prohibited by principle anyway), fine-tuned/calibrated personas, batch queue processing, Hindi TTS of feedback, mobile UI, auth (single-user demo).

## 7. Success Metrics

- **Demo:** end-to-end live run < 5 min; ≥ 1 non-obvious, checkable prediction surfaced; judges ask "can we run our own episode through it?" — the win condition.
- **Product (post-hackathon):** correlation between predicted and actual drop-off on back-tested episodes; % of greenlight decisions where the report changed the call; editor time-per-submission delta.
- **Counter-metrics:** editors rubber-stamping the score without opening the evidence (human-out-of-the-loop drift); writers gaming detectable panel preferences; per-writer aggregation creeping in via workarounds (audit: no writer identifiers anywhere in storage).

## 8. Risks & Open Questions

| # | Risk / Question | Handling |
|---|---|---|
| R1 | Persona fidelity for Tier-2 Hindi listeners unproven; LLM panels have documented Western bias | Confidence notes on every report; back-test framing; calibration is the post-hackathon roadmap |
| R2 | MiroFish integration deeper than expected (seed-format mismatch with narrative content — it was built for news/scenario prediction) | Hour 0–8 spike is exactly this; fallback = call OASIS/CAMEL directly with our own persona prompts |
| R3 | Live demo latency/flake | NFR-6 text-path fallback + pre-recorded run of every step |
| R4 | Simulation cost blowup at 30 personas × N beats | Cap beats per episode; triage mode; measured in hour 0–8 spike |
| R5 | Build-it-themselves: Pocket FM's AI team is the strongest competitor for this concept | Speed + MiroFish/OASIS head start; position calibration methodology (their ground truth + our engine) as partnership, not threat |
| Q1 | Does the hackathon grant IP to Pocket FM? Affects post-event commercialization framing | Check event T&Cs before pitching "product wedge" language |
| Q2 | Panel presets: which 4 archetypes best match real Pocket FM listener base? | [ASSUMPTION: romance-binge/thriller-commuter/superfan/sampler] — ask a Pocket FM mentor at the event |
| Q3 | Can Pocket FM mentors share one real episode retention curve during the event? | Would upgrade FR-6.1 from public-signals overlay to true predicted-vs-actual — the strongest possible demo slide |

## 9. Demo Plan (5 minutes)

1. Cold open: "Pocket FM learns a story failed after $2,400. We move that moment to before rupee one."
2. Upload Ep 02 transcript live → panel select (Tier-2 Hindi romance) → Simulate. **Demo strategy (adversarial-review finding):** full swarm chain is 15–40 min cold (Zep graph build dominates) — pre-run the full simulation the night before and show its cached verdict; the LIVE run on stage is triage mode (~1 min). Both are real; say so honestly ("triage live, full swarm ran last night — here's its deeper report").
3. Verdict screen: score, segmented breakdown, drop-off cliff annotated.
4. Chat with the churned persona — the "wow" beat.
5. Back-test overlay + honesty note on confidence.
6. Close on money: "This run: ~$3. The pilot it informs: $2,400. The wrong rejection it prevents: a 1B-play franchise. The funnel it triages: 300,000 writers."
7. **Scripted answer to the win-condition question** ("can we run our own episode?"): "Give us 5 published episodes — we predict their drop-off curves blind, you compare against your seconds-level analytics. That back-test is the pilot."
