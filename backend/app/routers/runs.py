"""F3 — simulation runs; F4 — verdict report; F6 — back-test flag."""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Panel, Persona, Report, Run, Submission
from app.schemas import PersonaOut, ReportOut, RunIn, RunOut
from app.services.report.export import report_to_markdown
from app.services.simulation import runner

router = APIRouter(prefix="/api/runs", tags=["runs"])


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
    return report


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
