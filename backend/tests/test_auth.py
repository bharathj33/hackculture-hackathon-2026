"""Editor JWT auth tests.

Runs in the same process as test_e2e.py (shared engine + lru_cached settings),
so auth is toggled by mutating the cached Settings object inside the fixture —
env-identical to test_e2e at import time, restored to auth-off on teardown so
test_e2e still runs fully open.
"""
import os
import time
from datetime import datetime, timedelta, timezone

os.environ["DEMO_MOCK"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///./test_storycritic.db"

import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app

# 32+ bytes: PyJWT 2.13 warns on HMAC keys shorter than RFC 7518 recommends
SECRET = "test-secret-key-0123456789abcdef"


@pytest.fixture(scope="module")
def client():
    settings = get_settings()
    settings.jwt_secret = SECRET
    settings.auth_users = "alice:wonderland,bob:builder"
    with TestClient(app) as c:  # lifespan seeds editors from auth_users
        yield c
    # restore auth-off so test_e2e (same process) runs open
    settings.jwt_secret = ""
    settings.auth_users = ""


@pytest.fixture()
def token(client):
    r = client.post(
        "/api/auth/login", json={"username": "alice", "password": "wonderland"}
    )
    return r.json()["access_token"]


def _auth(tok):
    return {"Authorization": f"Bearer {tok}"}


def test_login_success(client):
    r = client.post(
        "/api/auth/login", json={"username": "alice", "password": "wonderland"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == get_settings().jwt_expiry_hours * 3600
    payload = jwt.decode(body["access_token"], SECRET, algorithms=["HS256"])
    assert payload["sub"] == "alice"


def test_login_wrong_password(client):
    r = client.post(
        "/api/auth/login", json={"username": "alice", "password": "nope"}
    )
    assert r.status_code == 401
    assert r.json()["detail"] == "invalid credentials"


def test_login_unknown_user(client):
    # same 401 as wrong password — no username enumeration
    r = client.post("/api/auth/login", json={"username": "eve", "password": "x"})
    assert r.status_code == 401
    assert r.json()["detail"] == "invalid credentials"


def test_me_with_token(client, token):
    r = client.get("/api/auth/me", headers=_auth(token))
    assert r.status_code == 200
    assert r.json() == {"username": "alice"}


def test_me_without_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_protected_route_requires_token(client, token):
    assert client.get("/api/panels").status_code == 401  # no token
    r = client.get("/api/panels", headers=_auth(token))
    assert r.status_code == 200
    assert len(r.json()) >= 4  # presets seeded — gate wraps a working route


def test_garbage_token_rejected(client):
    r = client.get("/api/auth/me", headers=_auth("not.a.jwt"))
    assert r.status_code == 401


def test_expired_token_rejected(client):
    stale = jwt.encode(
        {"sub": "alice", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        SECRET,
        algorithm="HS256",
    )
    r = client.get("/api/auth/me", headers=_auth(stale))
    assert r.status_code == 401
    assert r.json()["detail"] == "invalid or expired token"


def test_wrong_signature_rejected(client):
    forged = jwt.encode(
        {"sub": "alice", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
        "wrong-secret-key-0123456789abcde",
        algorithm="HS256",
    )
    assert client.get("/api/auth/me", headers=_auth(forged)).status_code == 401


def test_health_stays_open(client):
    assert client.get("/health").json()["ok"]


def test_auth_disabled_mode(client):
    """Empty JWT_SECRET = everything open (local dev / e2e tests)."""
    settings = get_settings()
    settings.jwt_secret = ""
    try:
        assert client.get("/api/panels").status_code == 200  # no token needed
        assert client.get("/api/auth/me").json() == {"username": "dev"}
        # login is meaningless without a signing secret — explicit 503
        r = client.post(
            "/api/auth/login", json={"username": "alice", "password": "wonderland"}
        )
        assert r.status_code == 503
    finally:
        settings.jwt_secret = SECRET


def test_full_flow_through_gate(client, token):
    """Ingest works end-to-end behind the gate (DEMO_MOCK — no network)."""
    sub = client.post(
        "/api/ingest/text",
        json={"text": "रात का समय था। मीरा ने दरवाज़ा खोला और चौंक गई।\n" * 40},
        headers=_auth(token),
    ).json()
    for _ in range(50):
        sub = client.get(f"/api/ingest/{sub['id']}", headers=_auth(token)).json()
        if sub["status"] != "processing":
            break
        time.sleep(0.1)
    assert sub["status"] == "ready"
