"""FR-1.2/1.3 — audio/video → speaker-attributed transcript → text ingest path.

Hour 20-28 scope. Primary: ElevenLabs Scribe v2 (Hindi-strong).
Narrator trap (addendum): may return ONE speaker — story_rep must not depend on
speaker count.
"""
import hashlib
import logging
import subprocess
import tempfile

from app.config import get_settings
from app.db import SessionLocal
from app.models import Submission
from app.services import media_store
from app.services.preprocess.story_rep import build_story_rep

log = logging.getLogger(__name__)


def extract_audio(video_bytes: bytes) -> bytes:
    """FR-1.3: mp4 → wav via ffmpeg."""
    with tempfile.NamedTemporaryFile(suffix=".mp4") as vf, tempfile.NamedTemporaryFile(
        suffix=".wav"
    ) as af:
        vf.write(video_bytes)
        vf.flush()
        subprocess.run(
            ["ffmpeg", "-y", "-i", vf.name, "-vn", "-ac", "1", "-ar", "16000", af.name],
            check=True,
            capture_output=True,
        )
        return af.read()


def transcribe(audio_bytes: bytes) -> str:
    """FR-1.2: ElevenLabs Scribe v2 ASR + diarization → 'SPEAKER: line' transcript."""
    from elevenlabs.client import ElevenLabs

    client = ElevenLabs(api_key=get_settings().elevenlabs_api_key)
    result = client.speech_to_text.convert(
        file=audio_bytes,
        model_id="scribe_v2",
        diarize=True,
    )
    # TODO(hour 20+): verify response shape against current SDK; format speaker turns
    return getattr(result, "text", str(result))


def transcribe_task(submission_id: str, data: bytes, media_type: str, suffix: str = "bin") -> None:
    db = SessionLocal()
    try:
        sub = db.get(Submission, submission_id)
        if not sub:
            return
        # Store the upload before transcribing: transcription is lossy and one-shot,
        # so a failed or improved run can only be replayed from the original media.
        # Keyed by the upload's byte hash — content_hash is rewritten to the
        # transcript hash below, which would otherwise orphan the blob.
        path = media_store.put(sub.content_hash, suffix, data)
        if path:
            sub.media_path = path
            db.commit()
        try:
            audio = extract_audio(data) if media_type == "video" else data
            text = transcribe(audio)
            sub.raw_text = text
            sub.content_hash = hashlib.sha256(text.encode()).hexdigest()
            rep = build_story_rep(text)
            sub.story_rep = rep.model_dump()
            sub.status = "ready"
        except Exception as exc:  # noqa: BLE001
            log.exception("transcription failed")
            sub.status = "failed"
            sub.error = str(exc)[:500]
        db.commit()
    finally:
        db.close()
