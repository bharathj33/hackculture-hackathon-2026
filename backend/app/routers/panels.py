"""F2 — panel selection. Presets seeded on startup (see main.py)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Panel
from app.schemas import CastProfileOut, PanelIn, PanelOut
from app.services.panel_cast import build_panel_cast

router = APIRouter(prefix="/api/panels", tags=["panels"])


@router.get("", response_model=list[PanelOut])
def list_panels(db: Session = Depends(get_db)):
    return db.query(Panel).order_by(Panel.is_preset.desc(), Panel.created_at).all()


@router.post("", response_model=PanelOut)
def create_panel(body: PanelIn, db: Session = Depends(get_db)):
    """FR-2.2 custom panel (stretch) / FR-2.4 saved configs."""
    panel = Panel(name=body.name, config=body.config.model_dump(), is_preset=False)
    db.add(panel)
    db.commit()
    db.refresh(panel)
    return panel


@router.get("/{panel_id}", response_model=PanelOut)
def get_panel(panel_id: str, db: Session = Depends(get_db)):
    panel = db.get(Panel, panel_id)
    if not panel:
        raise HTTPException(404, "panel not found")
    return panel


@router.get("/{panel_id}/cast", response_model=list[CastProfileOut])
def list_panel_cast(panel_id: str, db: Session = Depends(get_db)):
    """Generic listener roster for a panel — who gets cast, not run outcomes."""
    panel = db.get(Panel, panel_id)
    if not panel:
        raise HTTPException(404, "panel not found")
    return build_panel_cast(panel.config)
