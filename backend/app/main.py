"""StoryCritic backend — FastAPI app factory, preset seeding, TTL purge."""
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import SessionLocal, init_db
from app.models import Panel, Submission
from app.routers import chat, ingest, panels, runs

logging.basicConfig(level=logging.INFO)

# FR-2.1 preset panels — [ASSUMPTION Q2: archetypes to be confirmed with Pocket FM mentor]
PRESET_PANELS = [
    ("Tier-2 Hindi romance binge-listener", {"persona_count": 20, "market": "IN", "language": "hi", "genre_affinities": ["romance", "drama"], "habits": ["binge", "daily-commute"], "critic_archetypes": []}),
    ("US thriller commuter", {"persona_count": 20, "market": "US", "language": "en", "genre_affinities": ["thriller", "action"], "habits": ["commute", "sampler"], "critic_archetypes": []}),
    ("Genre superfan", {"persona_count": 15, "market": "IN", "language": "hi", "genre_affinities": ["fantasy", "epic"], "habits": ["completionist"], "critic_archetypes": []}),
    ("Casual sampler", {"persona_count": 15, "market": "IN", "language": "hi", "genre_affinities": [], "habits": ["free-episodes-only", "low-patience"], "critic_archetypes": []}),
]


def seed_presets() -> None:
    db = SessionLocal()
    try:
        if db.query(Panel).filter(Panel.is_preset).count() == 0:
            for name, config in PRESET_PANELS:
                db.add(Panel(name=name, config=config, is_preset=True))
            db.commit()
    finally:
        db.close()


def purge_expired_content() -> None:
    """NFR-7: raw story content is session-scoped — null it past TTL.

    Reports/runs/personas survive (keyed by content_hash); raw text does not.
    """
    ttl = get_settings().content_ttl_minutes
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=ttl)
    db = SessionLocal()
    try:
        expired = db.query(Submission).filter(
            Submission.created_at < cutoff, Submission.raw_text.isnot(None)
        )
        for sub in expired:
            sub.raw_text = None
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_presets()
    purge_expired_content()  # also run on each startup; cron/loop later if needed
    yield


app = FastAPI(
    title="StoryCritic",
    description="Audience-swarm content critique — validates content, never the creator.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(  # hackathon: open CORS for the demo frontend
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def periodic_purge(request, call_next):
    """NFR-7: TTL purge piggybacked on traffic (startup-only missed long demo days)."""
    global _last_purge
    import time as _t

    now = _t.monotonic()
    if now - _last_purge > 600:  # at most every 10 min
        _last_purge = now
        try:
            purge_expired_content()
        except Exception:  # noqa: BLE001
            logging.getLogger(__name__).exception("TTL purge failed (non-fatal)")
    return await call_next(request)


_last_purge = 0.0

app.include_router(ingest.router)
app.include_router(panels.router)
app.include_router(runs.router)
app.include_router(chat.router)


@app.get("/health")
def health():
    return {"ok": True}
