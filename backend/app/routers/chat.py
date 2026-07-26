"""F5 — interrogation: chat with a persona (FR-5.1) or the report agent (FR-5.2)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ChatMessage, Persona, Run
from app.schemas import ChatIn, ChatOut
from app.services.simulation import interrogate

router = APIRouter(prefix="/api/runs/{run_id}/chat", tags=["chat"])


@router.post("", response_model=ChatOut)
def chat(run_id: str, body: ChatIn, db: Session = Depends(get_db)):
    run = db.get(Run, run_id)
    if not run or run.status != "done":
        raise HTTPException(404, "completed run not found")

    persona = None
    if body.persona_id:
        persona = db.get(Persona, body.persona_id)
        if not persona or persona.run_id != run_id:
            raise HTTPException(404, "persona not found in this run")

    # LLM call BEFORE any insert — a failure must not roll back/lose the editor's message
    answer = interrogate.ask(db, run, persona, body.message)

    db.add(ChatMessage(run_id=run_id, persona_id=body.persona_id, role="editor", content=body.message))
    msg = ChatMessage(run_id=run_id, persona_id=body.persona_id, role="agent", content=answer)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return ChatOut(role="agent", content=answer, persona_id=body.persona_id, created_at=msg.created_at)


@router.get("", response_model=list[ChatOut])
def history(run_id: str, db: Session = Depends(get_db)):
    msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.run_id == run_id)
        .order_by(ChatMessage.created_at)
        .all()
    )
    return [
        ChatOut(role=m.role, content=m.content, persona_id=m.persona_id, created_at=m.created_at)
        for m in msgs
    ]
