# PRD Quality Review — StoryCritic (Audience-Swarm Content Critique)

Calibration: 36-hour hackathon internal-tool PRD. Stakes are a demo plus an internal pilot seed, not a launch. Rigor judged proportionally; launch-grade sections (rollout plans, compliance matrices) were not expected and their absence is not penalized. The stated hard constraint — **"validates content, never the creator"** — was checked for consistent enforcement across FRs, metrics, and storage implications.

## Overall verdict

This is an unusually good hackathon PRD: it has a real thesis ("the market's opinion, not a critic's opinion — move the failure signal before production spend"), NFRs with actual numbers, honest risk handling with named fallbacks, and a hard product constraint that is enforced in at least four distinct places rather than stated once and forgotten. What's at risk is narrower but real: the credibility feature (F6 back-test) contains an internal contradiction — the FR promises a "predicted vs actual" overlay while its own assumption admits the actual data doesn't exist — and the storage/persistence model is unstated, which leaves both the "no writer identifiers anywhere in storage" audit and the post-hackathon success metrics without a substrate to run against. Fix those two and this is green-light material for its stakes.

## Decision-readiness — strong

Decisions are stated as decisions, not hedged: MiroFish as the engine with a named fallback ("call OASIS/CAMEL directly with our own persona prompts", R2); OpenAI over Qwen-plus for credits (addendum); single-LLM critic explicitly rejected as the core and demoted to a tier (addendum, Rejected alternatives). Trade-offs name what was given up — the rejected-alternatives section in the addendum is exactly what this dimension asks for, including the honest admission that fine-tuning on hit/flop data "is the correct post-hackathon calibration path" that they can't do in 36h. Open Questions are genuinely open: Q1 (hackathon IP terms) has no smuggled answer, Q2 (which 4 archetypes) is tagged as an assumption with a named resolution path ("ask a Pocket FM mentor at the event").

No findings.

## Substance over theater — strong

No persona theater: §2 is three roles in five lines, and each one drives something (the editor drives UJ-1 and the human-in-the-loop counter-metric; the judges drive NFR-1 and the demo plan; the writer drives FR-4.6's export constraint). NFRs carry product-specific thresholds — "≤ 5 minutes" (NFR-1), "< $5 in OpenAI tokens" (NFR-2), AGPL-3.0 flag (NFR-5) — not boilerplate. The Vision could not be swapped into another PRD: "$2,400/episode", "300k+ writers, targeting 1M", and the swarm-vs-single-critic framing are all specific to this bet. Differentiation is backed by the market-research doc rather than invented for a template slot.

No findings.

## Strategic coherence — strong

The thesis is explicit and everything hangs off it: F6 (back-test) exists to make the forecast claim credible, F5 (interrogation) exists to make it explainable, FR-1.5 and the out-of-scope list exist to enforce the content-not-creator constraint. Success Metrics validate the thesis rather than measuring activity — "correlation between predicted and actual drop-off" and "% of greenlight decisions where the report changed the call" (§7) are exactly the forecast-quality and decision-impact measures the thesis requires. Counter-metrics are present and sharp, especially "editors rubber-stamping the score without opening the evidence" and the storage audit for creeping per-writer aggregation. The 36-hour plan (§6) sequences by risk (spike the integration first), not by ease.

### Findings
- **low** Demo success metric partially unfalsifiable (§7 Demo) — "judges ask 'can we run our own episode through it?' — the win condition" is a vibe check, though the companion "≥ 1 non-obvious, checkable prediction" is measurable. *Fix:* acceptable as-is for hackathon stakes; no change required, noted for honesty.

## Done-ness clarity — adequate

Most FRs carry a testable consequence: FR-1.2 names the tool and output shape ("speaker-attributed transcript"), FR-3.3 enumerates the event-log contents, FR-4.3/4.4 specify the exact report artifacts, NFR-1/NFR-2 give hard bounds. But the weakest FRs sit at load-bearing points: the Story Representation and the back-test.

### Findings
- **high** FR-6.1 contradicts its own assumption (§4 F6, §9 step 5) — the FR text promises "display predicted vs actual drop-off overlay" on "a published episode with known performance," while the inline assumption in the same bullet concedes "actual retention curve unavailable to us." As written, the FR's headline deliverable is unbuildable, and F6 is the credibility pillar the demo closes on. The addendum ("Back-test honesty framing") already contains the correct resolution. *Fix:* reword FR-6.1 to what will actually be built — "display predicted curve overlaid against available public audience signals (plays, episode-level popularity), labeled as such" — and add a task to request the real retention curve from Pocket FM mentors at the event (they have seconds-level analytics per the addendum), which would upgrade the demo if obtained.
- **medium** FR-1.4 has no done condition for its hardest clause (§4 F1) — "detected hooks and cliffhangers" is the analytically hard part of the Story Representation, which every downstream FR consumes, and there is no verifiable consequence (how many? validated how? what happens when none are detected?). *Fix:* add one testable consequence, e.g. "for the demo transcript, Story Representation contains ≥ N beats with at least one annotated hook/cliffhanger per episode; a story with zero detected hooks still produces a valid representation."
- **medium** FR-2.2 custom panel builder has no acceptance bound and is a silent de-scope candidate (§4 F2, §6) — the presets (FR-2.1) carry the entire demo and UJ-1; the custom builder is UI-heavy hour-8–20 work with no definition of which attribute combinations must actually work. *Fix:* either mark FR-2.2 `[NON-GOAL for MVP if hour 20 milestone slips]` or bound it ("builder supports the 4 preset attribute axes only; free-text attributes out of scope").
- **low** NFR-3 explainability lacks an enforcement mechanism (§5) — "every number in the report must be traceable to persona events" is the right requirement but nothing says how traceability surfaces (link? tooltip? citation list in the packet?). *Fix:* one clause, e.g. "each score/pro/con in the report links to ≥ 1 persona event in the run log."

## Scope honesty — strong

The out-of-scope list (§6) does real work and is argued, not just listed ("per-writer analytics (prohibited by principle anyway)"). Assumptions are tagged inline where the user didn't confirm (FR-2.1, FR-2.2, FR-4.5, FR-6.1, NFR-2, Q2, and the addendum's frontend choice). Risks name their handling with real fallbacks rather than "monitor closely." Open-items density (2 open questions, ~7 assumptions, 4 risks) is appropriate — arguably ideal — for a 36-hour build.

### Findings
- **medium** Storage/persistence model is unstated, and the hard constraint's audit depends on it (§5 NFR-4, §7 counter-metrics, §4 FR-2.4) — NFR-4 says uploaded content stays "local/session-scoped," yet FR-2.4 saves panel configs across runs, FR-4.6 produces export artifacts, and the counter-metric audit requires verifying "no writer identifiers anywhere in storage." You cannot audit storage that is never defined, and the post-hackathon metric (predicted-vs-actual correlation on back-tests) implies run history that session-scoping would destroy. This is the one place the content-not-creator constraint is enforced by assertion rather than by a checkable requirement. *Fix:* add 2–3 lines (PRD or addendum): what persists (panel configs, run reports, event logs), what doesn't (source uploads beyond the session), and the explicit rule "persisted records carry a story-run ID only; no writer-identifying field exists in any schema."
- **low** UJ-1 ends in a loop the tool can't see (§3) — Priya sends "revise-and-resubmit," but resubmission of a revised story is just a fresh independent run ("Same writer, two stories, independent verdicts"), so v1-vs-v2 comparison is unsupported and unmentioned. That's a defensible omission (comparing versions is content-level and would be a nice post-MVP feature), but it's currently implicit. *Fix:* one line in Out of scope: "v1-vs-v2 revision comparison — each run is independent by design."

## Downstream usability — adequate

For a chain-top hackathon PRD feeding a 36-hour build, this holds up: FR IDs are contiguous and unique within features, UJ-1 has a named protagonist (Priya) carrying context inline, and the addendum cleanly separates technical-how from product-what. Cross-references resolve (FR-1.5 ← NFR-4; NFR-2 ← addendum triage tier; R2 ← addendum mismatch notes). "Story Representation" is used consistently as a defined artifact name across FR-1.4, FR-3.1, and the addendum. No glossary exists; at this stakes level and team size that is a minor cost, not a defect — flagged mechanically below.

### Findings
- **low** FR-3.4 binds vendor choices inside an FR (§4 F3) — "LLM backend: OpenAI... agent memory: Zep Cloud" is a technical-how statement living in the requirements section while the addendum is the designated home for exactly this. Harmless here, but it means a backend swap (e.g., the R2 fallback) technically invalidates an FR. *Fix:* move to addendum or reword as constraint rationale ("hackathon credits dictate OpenAI").

## Shape fit — strong

Correctly shaped as a capability spec for a single-operator internal tool: one UJ (not five), operational rather than user-facing success metrics where appropriate, and a Demo Plan section that a normal PRD wouldn't have but this one genuinely needs — the demo *is* the primary release. The hour-by-hour scope plan replacing a phased roadmap is the right formality level. No over-formalization detected; the single UJ earns its place by driving the report and export requirements.

No findings.

## Hard-constraint trace: "validates content, never the creator"

Checked explicitly per review instructions. Enforcement points found: §1 principle statement ("no per-writer aggregation, scoring history, or ranking exists anywhere"); FR-1.5 (metadata stripping at ingest, including PDF author field and byline); §6 out-of-scope (writer accounts/portal, per-writer analytics); §7 counter-metric (storage audit for aggregation creep); NFR-4 (no writer PII stored or processed); FR-4.6 (export packet excludes editorial-internal data). The constraint is consistently enforced at the FR and metric level. The single gap is the undefined storage model that makes the audit counter-metric uncheckable (medium finding under Scope honesty). No FR, metric, or journey step was found that leaks writer identity into the pipeline.

## Mechanical notes

- **No Assumptions Index.** Inline `[ASSUMPTION]` tags exist (FR-2.1, FR-2.2, FR-4.5, FR-6.1, NFR-2, Q2, addendum frontend choice) but are not indexed at the end, so the roundtrip check cannot run. Five minutes to add; worth it before the addendum feeds architecture.
- **Terminology drift:** NFR-2 says "triage score" mode; R4 and the addendum say "triage mode." Same thing, two names. Pick one.
- **No glossary.** Domain nouns (Story Representation, panel, persona, beat, packet, back-test) are used consistently by discipline rather than by definition. Acceptable at these stakes; add if this PRD outlives the hackathon.
- **ID scheme:** FR IDs are per-feature (FR-1.x…FR-6.x), contiguous, no duplicates. Single UJ labeled UJ-1. Risks R1–R4 and questions Q1–Q2 all referenced correctly (R2 ↔ addendum "Known mismatch (R2)").
- **Asset dependency unverified:** addendum notes the Ep 02 demo asset download "noted as done there, verify `assets/` exists" — an open verification task hiding in a parenthetical; surface it in the hour-0 checklist.
