"""Editor login — issues short-lived HS256 JWTs for the editorial team."""
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import require_editor
from app.config import get_settings
from app.db import get_db
from app.models import Editor

router = APIRouter(prefix="/api/auth", tags=["auth"])

# M-3: constant-work login — dummy hash checked when the username is unknown, so
# response time no longer distinguishes "no such user" from "wrong password".
_DUMMY_HASH = bcrypt.hashpw(b"timing-pad", bcrypt.gensalt()).decode()


class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    settings = get_settings()
    if not settings.jwt_secret:
        # Auth disabled (local dev) — no secret to sign with, and nothing is gated anyway.
        raise HTTPException(status_code=503, detail="auth disabled (JWT_SECRET not set)")
    editor = db.query(Editor).filter(Editor.username == body.username).first()
    # Same 401 AND same bcrypt cost for unknown user vs wrong password (M-3).
    stored = editor.password_hash if editor else _DUMMY_HASH
    ok = bcrypt.checkpw(body.password.encode(), stored.encode())
    if not editor or not ok:
        raise HTTPException(status_code=401, detail="invalid credentials")
    expires_in = settings.jwt_expiry_hours * 3600
    token = jwt.encode(
        {
            "sub": editor.username,
            "exp": datetime.now(timezone.utc) + timedelta(seconds=expires_in),
        },
        settings.jwt_secret,
        algorithm="HS256",
    )
    return TokenOut(access_token=token, expires_in=expires_in)


@router.get("/me")
def me(username: str = Depends(require_editor)) -> dict:
    return {"username": username}
