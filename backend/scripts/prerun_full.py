"""Tonight's pre-run: Ep 02 through the FULL MiroFish swarm chain.

Run: cd backend && nohup uv run python scripts/prerun_full.py > /tmp/prerun.log 2>&1 &
Progress: tail -f /tmp/prerun.log
"""
import logging
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("prerun")

from app.db import SessionLocal, init_db  # noqa: E402
from app.models import Panel, Run, Submission  # noqa: E402
from app.routers.ingest import _hash, _strip_bylines  # noqa: E402
from app.services.preprocess.story_rep import build_story_rep  # noqa: E402
from app.services.simulation import runner  # noqa: E402

TRANSCRIPT = Path(__file__).parent.parent.parent / "assets" / "ep02_transcript_hi.txt"
PANEL_NAME = "Tier-2 Hindi romance binge-listener"
# Small-but-real swarm: entity extraction cost scales with panel size
PERSONA_COUNT = 12
MAX_ROUNDS = 6


def main() -> int:
    init_db()
    db = SessionLocal()
    t0 = time.time()
    try:
        text = _strip_bylines(TRANSCRIPT.read_text(encoding="utf-8"))
        log.info("transcript: %d chars", len(text))

        rep = build_story_rep(text)
        log.info("story rep: %d beats", len(rep.beats))

        sub = Submission(content_hash=_hash(text), media_type="text", raw_text=text,
                         story_rep=rep.model_dump(), status="ready")
        db.add(sub)
        panel = db.query(Panel).filter(Panel.name == PANEL_NAME).first()
        if panel is None:
            from app.main import seed_presets

            seed_presets()
            panel = db.query(Panel).filter(Panel.name == PANEL_NAME).first()
        # cap panel for the pre-run
        panel_cfg = dict(panel.config, persona_count=PERSONA_COUNT)
        panel.config = panel_cfg
        db.commit()
        db.refresh(sub)

        run = Run(submission_id=sub.id, content_hash=sub.content_hash,
                  panel_id=panel.id, mode="full", backtest=True)
        db.add(run)
        db.commit()
        db.refresh(run)
        log.info("run created: %s (mode=full, personas=%d, max_rounds=%d)", run.id, PERSONA_COUNT, MAX_ROUNDS)
    finally:
        db.close()

    runner.execute_run_task(run.id)  # synchronous; MiroFish chain inside

    db = SessionLocal()
    try:
        run = db.get(Run, run.id)
        log.info("FINISHED in %.0f min: status=%s mode=%s tokens=%d error=%s",
                 (time.time() - t0) / 60, run.status, run.mode, run.cost_tokens, run.error)
        if run.report:
            log.info("SCORE: %s/10 | sim_id=%s", run.report.score, run.mirofish_sim_id)
            log.info("RUN_ID for demo: %s", run.id)
        return 0 if run.status == "done" else 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
