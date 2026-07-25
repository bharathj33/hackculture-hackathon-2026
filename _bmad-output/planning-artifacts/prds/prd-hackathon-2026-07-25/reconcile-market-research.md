# Input Reconciliation — Market Research vs PRD + Addendum

**Input:** `research/market-ai-story-critique-for-audio-drama-creators-research-2026-07-25.md`
**Against:** `prd.md` + `addendum.md` (prd-hackathon-2026-07-25)
**Date:** 2026-07-25
**Scope filter:** only gaps that matter for the 36-hour build or the 5-minute demo. Long-term GTM, market-size, and post-hackathon roadmap detail were deliberately allowed to drop.

---

## Verdict

Coverage is strong. The PRD carries every load-bearing product decision from the research: content-not-creator constraint (verbatim, as hard constraint), back-test as first-class feature, human-in-the-loop framing, two-tier triage/deep-sim cost design, multi-modal ingest with text-path fallback, segmented scores, persona chat, confidence notes, the "$3 vs $2,400" money close, and the "judges ask to run their own episode" win condition. The addendum preserves the MiroFish seed-model mismatch (R2) and the narrator-trap diarization warning.

Six gaps remain that would plausibly change what gets built or said on stage.

---

## GAP-1 (HIGH, demo pitch) — Pocket FM's own AI creation suite is never mentioned

Research: Pocket FM's creators already work inside the platform's AI suite — **Planner Agent (arcs), Context Agent (continuity), Drama Agent (pacing/tension/cliffhangers)** — used by the 300k creators publishing last year. Two consequences the research draws:

1. **Positioning:** the platform has AI for *generation* but nothing for *pre-publication evaluation*. "Your agents write the flood; nothing predicts whether it lands" is the sharpest one-line differentiation available, and the judges are the people who built that suite.
2. **Threat:** the research names Pocket FM's own AI team as the **biggest build-it-themselves competitive threat**, with the counter being speed + MiroFish/OASIS head start + calibration methodology.

PRD/addendum: absent entirely. The addendum's competitor snapshot lists external clusters only; the PRD risk table (R1–R4, Q1–Q2) has no build-it-themselves entry. The demo plan's cold open prices the problem but never lands the "you already trust AI to generate — let it evaluate too" beat, which also pre-empts the "isn't AI critique weird for writers?" objection (this audience is already AI-tool-native).

**Fix:** one line in the demo plan (step 1 or 6) invoking the Planner/Context/Drama suite; one risk-table row for build-it-themselves with the speed/head-start counter (also feeds Q1's IP framing).

## GAP-2 (HIGH, likely judge Q&A) — the "why not just prompt GPT?" moat answer is dropped

Research: a frontier-model one-shot "predict audience reaction" prompt could commoditize shallow versions of this; the counter is that **calibration against Pocket FM's seconds-level ground-truth data is the moat, not the prompt** — data no external vendor has, and accuracy improves longitudinally as real outcomes feed persona calibration.

PRD/addendum: the addendum rejects the single-LLM critic as the *core* (kept as triage mode), which covers the product decision — but neither doc carries the defensive answer for when a judge (OpenAI is literally on the panel) asks "why is this not a GPT prompt?" The calibration-as-moat argument is the prepared answer and also the post-hackathon ask ("give us ground-truth access for a governed pilot").

**Fix:** add to Risks or Demo Plan as a prepared-Q&A line. Zero build cost, high demo value.

## GAP-3 (MEDIUM, credibility slide) — precedent evidence numbers dropped

Research verdict rests on the category being **"unoccupied, precedented, and economically grounded."** The addendum keeps "unoccupied" (competitor clusters, category intersection) but drops all *precedent* evidence:

- **ScriptSooth** (Marketing Architects): synthetic-audience pre-testing of TV ad scripts already ships commercially — closest conceptual neighbor
- **Synthetic focus groups: 80–95% claimed agreement with human panels** (one Gen Alpha study >95%)
- **ScriptBook: 86–87% claimed box-office forecast accuracy** since 2014
- Netflix/House-of-Cards data-greenlight canon legitimizing the category

The research flags these as vendor-published (medium-low confidence) — cite them as "vendors claim," not as our accuracy. But with **zero validation data of our own at demo time** (a research-acknowledged weakness), these third-party numbers are the only external credibility available besides the back-test. A judge asking "does synthetic-audience testing even work?" currently has no answer in the PRD.

**Fix:** 2–3 bullets on the back-test/credibility slide: "precedented — ScriptSooth ships this for ads; vendors report 80–95% human-panel agreement; we add the missing pieces: episodic narrative, drop-off curves, Hindi."

## GAP-4 (MEDIUM, product framing) — coin-economics / paywall-conversion mapping diluted

Research differentiator #2 is *serialized-native metrics*: per-episode drop-off, cliffhanger strength, **and the paywall-conversion gate — early-episode quality gates coin conversion (85% series-finish once 10+ episodes unlocked), so drop-off in episodes 1–10 is a revenue event, not just a retention event.** This is also high-priority pain point #3.

PRD: FR-4.3 has the drop-off timeline and the addendum keeps the 85% stat as inert market data, but no requirement or demo beat ties a predicted cliff to coin economics. The demo says "cliff at episode-2 midpoint" — the research's framing would say "cliff at episode-2 midpoint, *inside the conversion window that decides whether this listener ever pays*."

**Fix:** either a small FR (annotate drop-off points falling in the ep-1–10 conversion window) or, at minimum, one sentence in demo step 3. Judges think in coin economics; this converts a UX chart into a revenue argument.

## GAP-5 (LOW-MEDIUM, pitch sharpening) — asymmetric-error framing lost

Research: "a wrong greenlight costs production + promotion + slot opportunity; **a wrong rejection loses a potential 1B-play franchise — both invisible in current tooling.**" The PRD prices only the wrong-greenlight side ($2,400 pilot). The wrong-rejection side is what justifies running the tool on *rejects* too (revise-and-resubmit, as in UJ-1) and doubles the value story at zero build cost.

**Fix:** one line in demo close or Vision.

## GAP-6 (LOW, prepared response) — the back-test challenge as the canned answer to the win condition

Research consideration-stage move: **"give us 5 published episodes, we predict the drop-off curve blind."** The PRD defines the win condition (judges ask "can we run our own episode?") but scripts no response. The blind-prediction challenge is the prepared yes — it converts the winning question into a concrete next step and is the natural bridge to the governed-pilot ask.

**Fix:** one line in Demo Plan step 6 / Q&A notes.

---

## Explicitly checked and adequately covered (no action)

- Content-not-creator principle → PRD §1 hard constraint + FR-1.5 + counter-metric audit
- Back-test mandatory + honest framing (no internal retention curve) → F6 + addendum demo-asset note
- Human-in-the-loop judge preference → §2, UJ-1, demo framing
- End-on-money judge preference → demo step 6
- Two-tier triage/deep design for funnel-scale cost → NFR-2 + addendum rejected-alternatives
- Non-Western persona-fidelity bias risk → R1
- AGPL-3.0 posture → NFR-5 + addendum
- Text-first priority order / graceful degradation → NFR-6 + 36h plan sequencing
- Confidence intervals, never bare scores → FR-6.2, NFR-3
- Feedback packet as writer-retention lever (silent-rejection churn) → §1, UJ-1, FR-4.6 (rationale slightly thinner than research but semantically present)
- Narrator trap (single-narrator diarization) → addendum
- MiroFish seed-model mismatch + OASIS/CAMEL fallback → R2 + addendum

## Consciously fine to drop (hackathon-irrelevant)

Market-size beyond the addendum snapshot (global audio-drama $, 350M→540M users, synthetic-data CAGR); per-episode writer fee ranges (₹800–3,000); Kuku FM/Pratilipi funding detail; Deloitte adoption-process norms; phases 1–3 GTM detail; Nippon TV micro-drama trend; OpenAI/Lightspeed-as-investor-signal; longitudinal calibration flywheel (post-hackathon; partially recovered via GAP-2's moat line).
