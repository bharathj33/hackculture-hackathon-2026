"""FR-1.4 — normalize any input text into the Story Representation.

Done-condition: output validates against schemas.StoryRep (≥1 beat, spans, tagged
hooks/cliffhangers) and demo transcript yields a stable golden file.
"""
import json
import logging

from openai import OpenAI

from app.config import get_settings
from app.db import SessionLocal
from app.models import Submission
from app.schemas import StoryRep

log = logging.getLogger(__name__)

_PROMPT = """You are a story-structure analyst for serialized audio drama.
Split the story into sequential beats. For each beat give: idx, text_span (verbatim
source excerpt, <=400 chars), summary (1 sentence, ALWAYS in English for the editorial UI,
even when the source text is Hindi or mixed), episode (int, default 1),
is_hook (opens a question/promise), is_cliffhanger (ends on unresolved tension).
Also list characters and language code (BCP-47, e.g. hi, en).
Return STRICT JSON matching:
{"beats":[{"idx":0,"text_span":"...","summary":"...","episode":1,"is_hook":false,"is_cliffhanger":false}],
 "characters":["..."],"language":"hi"}"""


_MOCK_SUMMARIES = [
    "Meera opens the door at night and is startled by who she finds.",
    "A warning on the doorstep — the tension holds for a twelve-minute block.",
    "The mentor's role shifts; the strongest reversal in the arc lands here.",
    "She runs without thinking — contradicting the freeze response established earlier.",
    "Three days of silence; survivors of the last episode settle back in.",
    "A long explanation beat — speed-listeners flag the dialogue as heavy.",
    "The monetisation gate; conversion holds above the romance baseline.",
    "The journal's age does not match — mystery listeners re-engage.",
]


def _mock_story_rep(text: str) -> StoryRep:
    """DEMO_MOCK: deterministic beats by chunking — works keyless on any input."""
    chunks = [text[i : i + 800] for i in range(0, min(len(text), 8000), 800)] or [text]
    beats = [
        {
            "idx": i,
            "text_span": c[:400],
            "summary": _MOCK_SUMMARIES[i % len(_MOCK_SUMMARIES)],
            "episode": 1 + i // 5,
            "is_hook": i % 4 == 0,
            "is_cliffhanger": (i + 1) % 5 == 0,
        }
        for i, c in enumerate(chunks)
    ]
    return StoryRep(beats=beats, characters=["Meera", "Arjun"], language="hi")


def build_story_rep(text: str) -> StoryRep:
    if get_settings().demo_mock:
        return _mock_story_rep(text)
    client = OpenAI(api_key=get_settings().openai_api_key)
    resp = client.chat.completions.create(
        model=get_settings().model_beats,
        response_format={"type": "json_object"},
        messages=[{"role": "system", "content": _PROMPT}, {"role": "user", "content": text[:60_000]}],
    )
    data = json.loads(resp.choices[0].message.content)
    return StoryRep.model_validate(data)  # raises if schema violated — FR-1.4 gate


def build_story_rep_task(submission_id: str) -> None:
    """Background task: submission.raw_text → story_rep."""
    db = SessionLocal()
    try:
        sub = db.get(Submission, submission_id)
        if not sub or not sub.raw_text:
            return
        try:
            rep = build_story_rep(sub.raw_text)
            sub.story_rep = rep.model_dump()
            sub.status = "ready"
        except Exception as exc:  # noqa: BLE001
            log.exception("story rep failed")
            sub.status = "failed"
            sub.error = str(exc)[:500]
        db.commit()
    finally:
        db.close()


def pdf_to_text(data: bytes) -> str:
    """Extract text only — PDF author/metadata fields never leave this function (FR-1.5)."""
    try:
        from pypdf import PdfReader  # optional dep; add if PDF path used
        import io

        reader = PdfReader(io.BytesIO(data))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except ImportError as exc:
        raise RuntimeError("pypdf not installed — `uv add pypdf` for PDF ingest") from exc
