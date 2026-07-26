"""Pydantic request/response schemas (API contract)."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# ---- F1: ingest ----
class IngestTextIn(BaseModel):
    text: str = Field(min_length=1)


class SubmissionOut(BaseModel):
    id: str
    content_hash: str
    media_type: Literal["text", "audio", "video"]
    status: str  # loose on output — an unexpected DB status must not 500 a poll
    story_rep: dict | None = None
    error: str | None = None

    model_config = {"from_attributes": True}


# ---- FR-1.4: Story Representation (fixed schema — done-condition) ----
class Beat(BaseModel):
    idx: int
    text_span: str  # source text of the beat
    summary: str
    episode: int = 1
    is_hook: bool = False
    is_cliffhanger: bool = False


class StoryRep(BaseModel):
    beats: list[Beat] = Field(min_length=1)
    characters: list[str]
    language: str = "hi"


# ---- F2: panels ----
class PanelConfig(BaseModel):
    persona_count: int = Field(default=20, ge=5, le=50)
    market: str = "IN"
    language: str = "hi"
    genre_affinities: list[str] = []
    habits: list[str] = []
    critic_archetypes: list[str] = []  # FR-2.3, labeled critics


class PanelIn(BaseModel):
    name: str
    config: PanelConfig


class PanelOut(BaseModel):
    id: str
    name: str
    is_preset: bool
    config: dict

    model_config = {"from_attributes": True}


class CastProfileOut(BaseModel):
    """Generic cast member for a panel — not tied to any single run."""

    id: str
    handle: str
    group_label: str
    profile: str
    persona_prompt: str
    interests: list[str]


# ---- F3: runs ----
class RunIn(BaseModel):
    submission_id: str
    panel_id: str
    mode: Literal["full", "triage"] = "full"
    backtest: bool = False  # F6


class RunOut(BaseModel):
    id: str
    submission_id: str
    panel_id: str
    mode: str
    backtest: bool
    status: str  # loose on output — see SubmissionOut.status
    cost_tokens: int
    error: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None

    model_config = {"from_attributes": True}


class RunSummaryOut(BaseModel):
    """Run ledger row — joins report score and submission story metadata."""

    id: str
    submission_id: str
    panel_id: str
    mode: str
    status: str
    cost_tokens: int
    error: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    score: float | None = None
    persona_count: int
    language: str
    beat_count: int
    story_label: str
    panel_name: str


# ---- F4: report ----
class DropoffPoint(BaseModel):
    beat_idx: int
    retained_pct: float
    cliff: bool = False
    cause: str | None = None
    paywall_risk: bool = False  # FR-4.3 episodes 1-10 flag


class SegmentScore(BaseModel):
    group: str
    score: float
    n: int


class Fix(BaseModel):
    priority: int
    text: str
    est_delta: str  # directional, e.g. "+0.5-1.0 score with romance segment"


class BeatEngagementOut(BaseModel):
    beat_idx: int
    posts: int = 0
    comments: int = 0
    reactions: int = 0
    tweets: int = 0
    agents_engaged: int = 0
    silences: int = 0


class ReportOut(BaseModel):
    run_id: str
    score: float
    rationale: str
    pros: list[dict]
    cons: list[dict]
    dropoff: list[DropoffPoint]
    segments: list[SegmentScore]
    fixes: list[Fix]
    confidence_note: str
    beat_engagement: list[BeatEngagementOut] = []

    model_config = {"from_attributes": True}


# ---- F5: chat ----
class ChatIn(BaseModel):
    message: str
    persona_id: str | None = None  # null → report agent


class ChatOut(BaseModel):
    role: str
    content: str
    persona_id: str | None
    created_at: datetime


class PersonaOut(BaseModel):
    id: str
    group_label: str
    profile: dict
    event_log: list
    dropped_at_beat: int | None

    model_config = {"from_attributes": True}
