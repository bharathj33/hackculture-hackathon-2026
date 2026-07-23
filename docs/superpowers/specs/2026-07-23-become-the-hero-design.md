# Become the Hero — Design Spec

**Date:** 2026-07-23
**Team:** 3 people, 2 days
**Goal:** Live hackathon demo — a user records 30 seconds of their voice, picks a character in a real Pocket FM Hindi audio drama, and hears the story with that character's dialogue re-voiced in their own voice. The original performance (emotion, pacing, intonation) is preserved; only the vocal timbre changes.

## 1. Product summary

Listeners consume audio stories passively. This demo lets them step inside: the character's acting stays, the voice becomes theirs. Pitch angle for Pocket FM: personalization as a retention/premium lever — and Pocket FM already partners with ElevenLabs (since June 2024) for Hindi AI audio, so the demo runs on their own vendor stack.

**Source content:** "क्यों Muzhe करनी पड़ी गरीब नौकर से Shaadi?" Episode 02 (Beggar Husband), Pocket FM via YouTube (`lAIV5Qhld2Q`), Hindi, ~18 min, 48 kHz stereo. Demo uses a 90–120 s hero segment.

**Safety:** users can only clone their own voice, verified through a live recording prompt in the app (no file upload for the reference voice).

## 2. Demo scope

- **In scope (live on stage):** record 30 s mic sample → instant clone → speech-to-speech conversion of pre-segmented hero dialogue → remix → playback in a mobile-style PWA. Turnaround target ≤ 2 min.
- **Pre-baked (offline, done once before demo):** clip selection, source separation, transcription + diarization, manifest hand-verification.
- **Stretch:** story greets the listener by name in a cloned/narrator voice; second selectable character.
- **Out of scope:** arbitrary episode upload, user accounts, payments, Android/iOS native apps.

## 3. Architecture

```
OFFLINE (once, day 1)
  episode.m4a (yt-dlp)
    → pick 90–120 s segment (ffmpeg)
    → demucs htdemucs        → vocals.wav + background.wav
    → transcribe + diarize   → manifest.json (speaker, start, end, text)
    → hand-verify manifest   → cut per-segment WAVs (hero + others)

LIVE (per user, on stage)
  PWA: play original → pick character → record 30 s mic
    → POST /clone     (30 s sample → voice_id)
    → POST /convert   (each hero segment → STS with voice_id)
    → remix (ffmpeg): background + untouched other-speaker segments
                      + converted hero segments at original timestamps,
                      ~50 ms crossfades at joins
    → personalized.mp3 streamed back to PWA
```

Key invariant: STS output duration ≈ input duration (performance is preserved), so converted segments drop back at their original offsets — no time-stretching.

Transcript is used only for segmentation, character labeling, and UI subtitles. Synthesis is audio-to-audio; text never generates the voice.

## 4. Tech stack (research-pinned, July 2026)

Seven research passes were run (open VC models, Hindi TTS, hosted APIs, STS competitors deep-dive, marketplace-hosted open models, quality benchmarks, Hindi diarization). Decisions below cite the findings.

### 4.1 Voice conversion (core) — fallback chain

All engines sit behind one interface: `convert(segment_wav, user_ref) -> wav`, selected by env var. Demo day uses whichever passed the hour-1 ear test best.

| # | Engine | Why | Cost | Risk notes |
|---|--------|-----|------|-----------|
| 1 | **ElevenLabs Voice Changer** (`eleven_multilingual_sts_v2`, endpoint `POST /v1/speech-to-speech/{voice_id}`) | Only provider with all four in writing: Hindi on the STS path, explicit emotion preservation ("whispers, laughs, cries"), 30 s instant clone on a cheap tier, 5-min max segments. No published blind test even challenges it. STS model quality is identical across tiers (no v3 STS exists). | Creator tier $11 first month ≈ 100 STS min (1,000 credits/min). Starter $6 = 30 min — too tight for testing. | Cloud dependency; credits burn during testing. |
| 2 | **Resemble AI STS** (`POST https://f.cluster.resemble.ai/synthesize`, SSML `<resemble:convert src="URL">`) | Only true alternative: docs state "preserves delivery and timing"; Rapid Clone from 10 s, ready <1 min. Donor ≤5 min/≤50 MB, must be fetchable URL. | ~$0.36/min converted; <$30 weekend | Hindi on the STS path undocumented — must ear-test hour 1. Consent attestation at clone creation. |
| 3 | **fal.ai Chatterbox S2S** (`fal-ai/chatterbox/speech-to-speech`; HD variant `resemble-ai/chatterboxhd/speech-to-speech` at 48 kHz) | Zero-infra open-model path: `source_audio_url` + `target_voice_audio_url` (the 30 s clip *is* the clone — no setup, no consent flow). | $0.015/min ($0.02 HD) | VC checkpoint English-trained; Hindi unproven — a ~$0.10 test settles it. Output watermarked (fine, arguably a plus). |
| 4 | **Seed-VC v1 on RunPod** (RTX 4090 $0.69/hr or A40 $0.44/hr; Gradio `app.py` exposed via RunPod proxy, called with `gradio_client`) | Self-hosted insurance if the network/API dies. Zero-shot from 1–30 s, timbre-only (source prosody untouched), best open similarity (SECS 0.868). ~1.5 h setup. | ~$11 for 16 h of 4090 | Repo archived Nov 2025 (still works; weights auto-download). Hindi not in training data but content encoder (Whisper) is language-agnostic; slight accent drift possible. |

Ruled out (traps identified by research): Cartesia Voice Changer (officially deprecated Aug 20 2026, never upgraded past the old sonic stack), Camb.ai (no voice-swap endpoint; dubbing keeps the original voice — inverse of our need), Murf (clone enterprise-gated), MiniMax/Fish/Sarvam/Hume/LMNT (TTS-only, no STS — an ASR→TTS round-trip would destroy the original performance), Respeecher (marketplace voices, no instant user clone), Kits.ai (RVC music tuning; artifact risk on drama), RVC proper (needs per-user training, not zero-shot), Vevo-Timbre (conceptually exact but no Hindi, NC weights, no Mac path — only via its HF Space if curious).

### 4.2 Separation

**Demucs (htdemucs)** on the chosen segment → `vocals.wav` + `background.wav` (music + SFX bed, obtained as mix minus vocals or the "no_vocals" stem). Every VC research pass agreed: conversion quality depends on dry input more than engine choice. Separation runs offline where output can be ear-checked and re-run.

### 4.3 Transcription + diarization

| Priority | Option | Notes |
|----------|--------|-------|
| Primary | **ElevenLabs Scribe v2** — `POST /v1/speech-to-text`, `model_id: scribe_v2`, `diarize: true`, `language_code: hin` | One call: Hindi transcript + per-word speaker IDs + word timestamps + audio-event tags. Hindi in its "excellent" tier (≤5 % WER on clean speech). Same account as STS. Send the demucs **vocal stem**, not the mix. |
| A/B | **Sarvam Batch STT** (`saaras:v3`, diarization enabled) | Per-word stable speaker IDs; beats Scribe on *spontaneous* Indian speech (IndicVoices ~19.3 % WER where it leads GPT-4o/Gemini/Scribe). Best Hinglish/code-mix handling. Run both on the segment; pick by ear. |
| Open backup | **pyannote community-1 + WhisperX** (faster-whisper large-v3, `language="hi"`, Hindi wav2vec2 alignment) | Best open diarizer (≈50 % less speaker confusion vs 3.1; `exclusive_speaker_diarization` output built for merging with ASR words). Set `min_speakers=3, max_speakers=6`. Mac note: faster-whisper is CPU-only on Apple Silicon (fine for one episode) or use mlx-whisper for the ASR half. |

Known drama-audio failure modes (why the manifest is hand-verified regardless of engine):
- Hindi conversational audio runs ~1.5–2× the DER of English benchmarks.
- Emotional range (shouting → whispering) can split one character into two clusters; constrain speaker count and merge clusters post-hoc.
- Overlapping dialogue: only the dominant voice is transcribed; keep overlap regions as metadata.
- **Biggest trap:** Pocket FM episodes often use one narrator voicing multiple characters — diarization cannot split that by design. Ear-check the episode day 1, hour 1; if true, fall back to an LLM pass over the transcript to split narrator vs quoted characters, or pick a segment with distinct actors.

### 4.4 Name-greeting stretch goal

- Primary: **ElevenLabs TTS** in the cloned/narrator voice (credits already there).
- Hindi-native alternative: **Sarvam Bulbul V3** — beat ElevenLabs on Hindi pronunciation/code-mixing in a 20k-vote blind study (ElevenLabs keeps full-band audio-quality edge). No self-serve cloning, so use for non-cloned narrator lines only.
- Open alternative: **IndicF5** (AI4Bharat, MIT, native Hindi, reference-audio cloning) — not marketplace-hosted; self-host only.
- Gotcha: spell names phonetically in Devanagari; F5-family and others garble rare proper nouns.

### 4.5 App stack

- **Backend:** FastAPI (Python) — endpoints below; ffmpeg for cutting/remixing; httpx for provider calls. Runs on a team laptop; PWA reaches it over LAN or a tunnel.
- **Frontend:** Mobile-style PWA imitating a Pocket FM-like player. Vite + React (or plain JS if faster), MediaRecorder API for the 30 s mic capture, served over HTTPS (mic permission requires it — use the tunnel or local cert).
- **No database.** Filesystem + in-memory job dict. Hackathon YAGNI.

## 5. Components & interfaces

### 5.1 Offline prep CLI (`prep/`)
- `download.py` — yt-dlp pull (done).
- `separate.py` — ffmpeg segment cut + demucs → `assets/vocals.wav`, `assets/background.wav`.
- `transcribe.py` — Scribe v2 (and Sarvam A/B) → raw diarized JSON.
- `build_manifest.py` — raw JSON → `assets/manifest.json`; human edits it by hand afterward.
- Manifest schema:

```json
{
  "episode": "beggar-husband-ep02",
  "segment_offset_sec": 312.0,
  "duration_sec": 105.0,
  "characters": {"HERO": "Arjun", "SPEAKER_2": "Narrator"},
  "lines": [
    {"id": "L01", "speaker": "HERO", "start": 3.2, "end": 8.9,
     "text": "…", "wav": "segments/L01.wav"}
  ]
}
```

### 5.2 Backend API (`api/`)
- `POST /api/clone` — body: 30 s webm/wav from MediaRecorder. Calls provider IVC → returns `{clone_id}`. For fal/Seed-VC paths, just stores the reference wav.
- `POST /api/render` — body: `{clone_id, character}`. Converts every manifest line of that character via the active engine, remixes, returns `{job_id}`; progress via `GET /api/job/{job_id}` polling.
- `GET /api/audio/{job_id}` — final mp3.
- `converters/` module — `base.py` defines `convert(segment_wav, user_ref) -> wav`; `elevenlabs.py`, `resemble.py`, `fal_chatterbox.py`, `seedvc_runpod.py` implement it. `CONVERTER=` env var selects.
- Remix (`remix.py`): background.wav + untouched non-hero segments + converted hero segments placed at manifest offsets, 50 ms crossfades, loudness-normalized (ffmpeg `loudnorm`).

### 5.3 PWA (`web/`)
- Screens: (1) story player with original clip + character cards, (2) record screen — live prompt text to read, waveform meter, 30 s cap, (3) processing screen with per-line progress, (4) playback screen — personalized episode, A/B toggle original vs yours, share/replay.
- The record prompt doubles as the safety gate: reference audio only ever comes from the live mic flow.

## 6. Error handling

- Provider call fails → automatic retry (2×), then engine fallback in chain order; UI shows "switching engine" toast.
- Clone rejected / too short → re-record screen with min-length validation client-side.
- Conversion returns wrong duration (>±10 %) → keep original line audio for that segment (graceful degradation — one un-swapped line beats a broken remix).
- Network dead on stage → `CONVERTER=seedvc_runpod` (pod pre-warmed) or fully local Seed-VC on the Mac as last resort; assets and manifest are all local.

## 7. Validation plan (hour-1 ear tests, day 1)

Run before any integration code — total <1 h, <$1:
1. Demucs the chosen segment; ear-check vocal stem dryness.
2. One emotionally loud hero line through: ElevenLabs STS, Resemble STS, fal Chatterbox S2S (each with one team member's 30 s voice). Rank by ear.
3. Scribe v2 vs Sarvam on the segment; check speaker labels against reality; confirm distinct voice actors (see narrator trap).
4. Decision checkpoint: pin primary engine + diarization source; record results in README.

## 8. Two-day plan (3 people)

**Day 1**
- P1 (audio pipeline): segment choice, demucs, Scribe/Sarvam runs, manifest build + hand-verify, per-line WAV cuts. Owns hour-1 ear tests with P2.
- P2 (backend): FastAPI skeleton, ElevenLabs clone+STS integration, converter interface + fal fallback, remix module. Spins up RunPod Seed-VC pod (~1.5 h) in parallel/idle time.
- P3 (frontend): PWA screens, MediaRecorder flow, polling UX, player with A/B toggle.
- End of day 1: full pipeline works end-to-end for one hero line, driven by curl.

**Day 2**
- Morning: integrate PWA ↔ API; full segment render; crossfade/loudness polish; engine A/B and final pick.
- Afternoon: stretch goals (name greeting, second character) only if core is stable; rehearse demo twice, including a network-kill drill (fallback path); record a backup video of a successful run.

## 9. Costs (weekend, realistic)

| Item | Cost |
|------|------|
| ElevenLabs Creator (first month) | $11 |
| Resemble pay-as-you-go credits | ~$5–10 |
| fal.ai Chatterbox tests | <$1 |
| RunPod 4090, ~16 h | ~$11 |
| Sarvam | free credits (₹1,000 promo) |
| **Total** | **~$25–35** |

## 10. Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| One narrator voices all characters in the episode | Medium-high (common Pocket FM format) | Detected hour 1; pick different segment/episode, or LLM transcript split |
| Demucs leaves music bleed → VC artifacts | Medium | Ear-check offline; try htdemucs_ft / different segment |
| ElevenLabs credits exhausted by testing | Medium | Creator tier (~100 min); test on short lines; fal path for bulk experiments |
| Hindi accent drift on open-model fallbacks | Medium | They are fallbacks; primary path is Hindi-certified |
| Stage network failure | Low-medium | Pre-warmed RunPod pod + local Seed-VC + pre-rendered backup output + backup video |
| Mic quality on stage (noise) | Medium | `remove_background_noise=true` on ElevenLabs STS/IVC; record prompt screen tells user to get close to mic |

## 11. Open questions (to resolve day 1)

1. Which 90–120 s window of Episode 02 has the best hero material (distinct voices, emotional range, low music)?
2. Does the episode use distinct voice actors per character? (Narrator trap check.)
3. Final engine pick after ear test — ElevenLabs assumed, verify.
4. Tunnel choice for HTTPS mic access (cloudflared / ngrok / tailscale funnel).
