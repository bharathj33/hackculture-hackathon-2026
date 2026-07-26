"""F3 — simulation runs; F4 — verdict report; F6 — back-test flag."""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Panel, Persona, Report, Run, Submission
from app.schemas import BeatEngagementOut, PersonaOut, ReportOut, RunIn, RunOut, RunSummaryOut
from app.services.beat_engagement import derive_beat_engagement
from app.services.report.export import report_to_markdown
from app.services.display_label import pick_story_label
from app.services.simulation import runner

router = APIRouter(prefix="/api/runs", tags=["runs"])


def _persona_count(persona_cnt: int | None, panel_config: dict) -> int:
    if persona_cnt:
        return int(persona_cnt)
    return int(panel_config.get("persona_count", 20))


def _story_meta(story_rep: dict | None, panel_config: dict) -> tuple[str, int, str]:
    rep = story_rep or {}
    language = str(rep.get("language") or panel_config.get("language", "hi"))
    beats = rep.get("beats") or []
    label = pick_story_label(rep, panel_config)
    return language, len(beats), label


def _run_summary_row(
    run: Run,
    score: float | None,
    persona_cnt: int | None,
    story_rep: dict | None,
    panel_config: dict,
    panel_name: str,
) -> RunSummaryOut:
    language, beat_count, story_label = _story_meta(story_rep, panel_config)
    return RunSummaryOut(
        id=run.id,
        submission_id=run.submission_id,
        panel_id=run.panel_id,
        mode=run.mode,
        status=run.status,
        stage=run.stage,
        cost_tokens=run.cost_tokens,
        error=run.error,
        started_at=run.started_at,
        finished_at=run.finished_at,
        score=score,
        persona_count=_persona_count(persona_cnt, panel_config),
        language=language,
        beat_count=beat_count,
        story_label=story_label,
        panel_name=panel_name,
    )


@router.post("", response_model=RunOut)
def create_run(body: RunIn, bg: BackgroundTasks, db: Session = Depends(get_db)):
    sub = db.get(Submission, body.submission_id)
    if not sub:
        raise HTTPException(404, "submission not found")
    if sub.status != "ready":
        raise HTTPException(409, f"submission not ready (status={sub.status})")
    if not db.get(Panel, body.panel_id):
        raise HTTPException(404, "panel not found")

    run = Run(
        submission_id=sub.id,
        content_hash=sub.content_hash,
        panel_id=body.panel_id,
        mode=body.mode,
        backtest=body.backtest,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    bg.add_task(runner.execute_run_task, run.id)
    return run


@router.get("", response_model=list[RunSummaryOut])
def list_runs(db: Session = Depends(get_db)):
    """Run ledger — newest first; score from report, persona count from DB or panel config."""
    persona_counts = (
        db.query(Persona.run_id, func.count(Persona.id).label("persona_cnt"))
        .group_by(Persona.run_id)
        .subquery()
    )
    order_key = func.coalesce(Run.finished_at, Run.started_at)
    rows = (
        db.query(Run, Report.score, persona_counts.c.persona_cnt, Submission.story_rep, Panel.config, Panel.name)
        .outerjoin(Report, Report.run_id == Run.id)
        .outerjoin(persona_counts, persona_counts.c.run_id == Run.id)
        .join(Submission, Submission.id == Run.submission_id)
        .join(Panel, Panel.id == Run.panel_id)
        .order_by(desc(order_key).nullslast(), desc(Run.id))
        .all()
    )
    return [
        _run_summary_row(run, score, persona_cnt, story_rep, panel_config, panel_name)
        for run, score, persona_cnt, story_rep, panel_config, panel_name in rows
    ]


@router.get("/{run_id}", response_model=RunOut)
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = db.get(Run, run_id)
    if not run:
        raise HTTPException(404, "run not found")
    return run


@router.get("/{run_id}/report", response_model=ReportOut)
def get_report(run_id: str, db: Session = Depends(get_db)):
    report = db.get(Report, run_id)
    if not report:
        raise HTTPException(404, "report not ready")
    run = db.get(Run, run_id)
    panel = db.get(Panel, run.panel_id) if run else None
    sub = db.get(Submission, run.submission_id) if run else None
    personas = db.query(Persona).filter(Persona.run_id == run_id).all()
    beats_meta: dict[int, dict] = {}
    if sub and sub.story_rep:
        beats_meta = {int(b["idx"]): b for b in sub.story_rep.get("beats", [])}
    engagement = derive_beat_engagement(
        report.dropoff,
        personas,
        panel.config if panel else {},
        beats_meta,
    )
    return ReportOut(
        run_id=report.run_id,
        score=report.score,
        rationale=report.rationale,
        pros=report.pros,
        cons=report.cons,
        dropoff=report.dropoff,
        segments=report.segments,
        fixes=report.fixes,
        confidence_note=report.confidence_note,
        beat_engagement=[BeatEngagementOut(**row) for row in engagement],
    )


@router.get("/{run_id}/report/export", response_class=PlainTextResponse)
def export_report(run_id: str, db: Session = Depends(get_db)):
    """FR-4.6 — writer-facing feedback packet (markdown). No internal/cost data."""
    report = db.get(Report, run_id)
    if not report:
        raise HTTPException(404, "report not ready")
    return report_to_markdown(report)


@router.get("/{run_id}/personas", response_model=list[PersonaOut])
def list_personas(run_id: str, db: Session = Depends(get_db)):
    """F5 support — pick a persona to interrogate."""
    return db.query(Persona).filter(Persona.run_id == run_id).all()
