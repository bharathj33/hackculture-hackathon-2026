"""F1 — multi-modal ingest. Text now; audio/video stubs wired for hour 20+."""
import hashlib
import re

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db import SessionLocal, get_db
from app.models import Submission
from app.schemas import IngestTextIn, SubmissionOut
from app.services import media_store
from app.services.preprocess import audio as audio_svc
from app.services.preprocess import story_rep as rep_svc

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


_BYLINE = re.compile(
    r"^\s*(by|author|written by|writer|लेखक|द्वारा)\s*[:\-—]?\s+\S.*$",
    re.IGNORECASE,
)


def _store_text_task(submission_id: str, content_hash: str, data: bytes) -> None:
    """Mirror a text upload to the Volume and record its path for later purge."""
    path = media_store.put(content_hash, "txt", data)
    if not path:
        return
    db = SessionLocal()
    try:
        sub = db.get(Submission, submission_id)
        if sub:
            sub.media_path = path
            db.commit()
    finally:
        db.close()


def _strip_bylines(text: str) -> str:
    """FR-1.5: drop author/byline lines from the head of the document."""
    lines = text.splitlines()
    head = [ln for ln in lines[:10] if not _BYLINE.match(ln)]
    return "\n".join(head + lines[10:])


@router.post("/text", response_model=SubmissionOut)
def ingest_text(body: IngestTextIn, bg: BackgroundTasks, db: Session = Depends(get_db)):
    """FR-1.1. FR-1.5: byline lines stripped; no filename/author metadata kept."""
    clean = _strip_bylines(body.text)
    sub = Submission(content_hash=_hash(clean), media_type="text", raw_text=clean)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    bg.add_task(rep_svc.build_story_rep_task, sub.id)
    bg.add_task(_store_text_task, sub.id, sub.content_hash, clean.encode())  # opt-in mirror
    return sub


@router.post("/file", response_model=SubmissionOut)
async def ingest_file(file: UploadFile, bg: BackgroundTasks, db: Session = Depends(get_db)):
    """FR-1.1 (pdf/txt/md), FR-1.2 (audio), FR-1.3 (video).

    FR-1.5: file.filename is used ONLY for type sniffing, never stored.
    """
    suffix = (file.filename or "").lower().rsplit(".", 1)[-1]
    data = await file.read()

    if suffix in ("txt", "md"):
        text = data.decode("utf-8", errors="replace")
        return ingest_text(IngestTextIn(text=text), bg, db)
    if suffix == "pdf":
        text = rep_svc.pdf_to_text(data)  # strips PDF metadata by extracting text only
        return ingest_text(IngestTextIn(text=text), bg, db)
    if suffix in ("mp3", "wav", "m4a", "mp4"):
        media_type = "video" if suffix == "mp4" else "audio"
        sub = Submission(
            content_hash=hashlib.sha256(data).hexdigest(),  # real content hash; re-hashed from transcript later
            media_type=media_type,
            status="processing",
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
        bg.add_task(audio_svc.transcribe_task, sub.id, data, media_type, suffix)
        return sub

    raise HTTPException(415, f"unsupported type: {suffix}")


@router.get("/{submission_id}", response_model=SubmissionOut)
def get_submission(submission_id: str, db: Session = Depends(get_db)):
    sub = db.get(Submission, submission_id)
    if not sub:
        raise HTTPException(404, "submission not found")
    return sub
