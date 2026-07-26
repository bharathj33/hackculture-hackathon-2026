"""Database schema.

NFR-7 (content-not-creator, mechanically auditable):
- NO author/writer/user identifier column exists in ANY content table
  (submissions/runs/reports/personas/chat_messages). `editors` is the sole
  exception: it holds editorial-staff login credentials only and has NO foreign
  key to (or from) any content table — editor identity never touches judgment.
- Raw story content is session-scoped: `submissions.raw_text` is nulled by the
  TTL purge; long-lived rows are keyed by `content_hash` only.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Panel(Base):
    """Audience panel config (F2). Presets seeded at startup; custom via API."""

    __tablename__ = "panels"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(120))
    is_preset: Mapped[bool] = mapped_column(default=False)
    # {persona_count, market, language, genre_affinities[], habits[], critic_archetypes[]}
    config: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Submission(Base):
    """One uploaded story artifact (F1). The unit of judgment.

    FR-1.5: ingest strips filename/PDF-author/byline before this row is created —
    nothing identifying ever reaches the DB.
    """

    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    content_hash: Mapped[str] = mapped_column(String(64), index=True)  # sha256 of normalized text
    media_type: Mapped[str] = mapped_column(String(10))  # text | audio | video
    status: Mapped[str] = mapped_column(String(20), default="processing")  # processing|ready|failed
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)  # session-scoped, TTL-purged
    story_rep: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # FR-1.4 schema
    # Unity Catalog Volume path of the stored upload; None when mirroring is off.
    # TTL-purged alongside raw_text so the blob never outlives the transcript (NFR-7).
    media_path: Mapped[str | None] = mapped_column(String(300), nullable=True)
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    runs: Mapped[list["Run"]] = relationship(back_populates="submission")


class Run(Base):
    """One simulation execution (F3): submission x panel x mode."""

    __tablename__ = "runs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id"))
    content_hash: Mapped[str] = mapped_column(String(64), index=True)  # survives content purge
    panel_id: Mapped[str] = mapped_column(ForeignKey("panels.id"))
    mode: Mapped[str] = mapped_column(String(10), default="full")  # full | triage
    backtest: Mapped[bool] = mapped_column(default=False)  # F6
    # live-interview handle (FR-5.1): valid only while the MiroFish OASIS env is alive
    mirofish_sim_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="queued")  # queued|running|done|failed
    cost_tokens: Mapped[int] = mapped_column(Integer, default=0)  # NFR-2 tracking
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)

    submission: Mapped[Submission] = relationship(back_populates="runs")
    report: Mapped["Report | None"] = relationship(back_populates="run", uselist=False)
    personas: Mapped[list["Persona"]] = relationship(back_populates="run")


class Report(Base):
    """Verdict report (F4). One per completed run."""

    __tablename__ = "reports"

    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), primary_key=True)
    score: Mapped[float] = mapped_column(Float)  # FR-4.1, 0-10
    rationale: Mapped[str] = mapped_column(Text)
    pros: Mapped[list] = mapped_column(JSON)  # FR-4.2 [{text, persona_refs[]}]
    cons: Mapped[list] = mapped_column(JSON)
    # FR-4.3 [{beat_idx, retained_pct, cliff: bool, cause, paywall_risk: bool}]
    dropoff: Mapped[list] = mapped_column(JSON)
    segments: Mapped[list] = mapped_column(JSON)  # FR-4.4 [{group, score, n}]
    fixes: Mapped[list] = mapped_column(JSON)  # FR-4.5 [{priority, text, est_delta}]
    confidence_note: Mapped[str] = mapped_column(Text)  # FR-6.2, always present
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    run: Mapped[Run] = relationship(back_populates="report")


class Persona(Base):
    """Simulated listener in a run (F3/F5). Enables chat + traceability (NFR-3)."""

    __tablename__ = "personas"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    group_label: Mapped[str] = mapped_column(String(80))  # segment key for FR-4.4
    profile: Mapped[dict] = mapped_column(JSON)  # generated persona card
    # [{beat_idx, action: continued|dropped|reacted, note}]
    event_log: Mapped[list] = mapped_column(JSON)
    dropped_at_beat: Mapped[int | None] = mapped_column(Integer, nullable=True)

    run: Mapped[Run] = relationship(back_populates="personas")


class Editor(Base):
    """Editorial team login (auth only, seeded from AUTH_USERS at startup).

    Content-not-creator: deliberately unlinked from every content table —
    editors authenticate, they are never recorded against submissions/runs.
    """

    __tablename__ = "editors"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(100))  # bcrypt, never plaintext
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class ChatMessage(Base):
    """Interrogation transcript (F5) — persona chat or report-agent chat."""

    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    persona_id: Mapped[str | None] = mapped_column(
        ForeignKey("personas.id"), nullable=True
    )  # null = report agent (FR-5.2)
    role: Mapped[str] = mapped_column(String(10))  # editor | agent
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
