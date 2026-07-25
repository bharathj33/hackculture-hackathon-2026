"""Editor JWT auth dependency.

Replaces the old X-Access-Code gate for public hosting. Editor-only identity —
content-not-creator (NFR-7) holds: the username returned here is never written
to any content table.
"""
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_settings

# auto_error=False so a missing header yields our 401 (HTTPBearer's default is 403)
_bearer = HTTPBearer(auto_error=False)


def require_editor(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    """Validate the Bearer JWT and return the editor's username.

    Empty JWT_SECRET = auth disabled (local dev / tests) — returns "dev".
    """
    settings = get_settings()
    if not settings.jwt_secret:
        return "dev"
    if creds is None:
        raise HTTPException(
            status_code=401,
            detail="not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(
            creds.credentials, settings.jwt_secret, algorithms=["HS256"]
        )
    except jwt.PyJWTError:  # covers expired, bad signature, malformed
        raise HTTPException(
            status_code=401,
            detail="invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload["sub"]
