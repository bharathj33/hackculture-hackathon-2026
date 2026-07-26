"""E2E flow tests in DEMO_MOCK mode — no API keys, no network."""
import os
import time

os.environ["DEMO_MOCK"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///./test_storycritic.db"

import pytest
from fastapi.testclient import TestClient

from app.main import app

STORY = "रात का समय था। मीरा ने दरवाज़ा खोला और चौंक गई।\n" * 40


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c
    if os.path.exists("test_storycritic.db"):
        os.remove("test_storycritic.db")


def _ingest(client, text=STORY):
    sub = client.post("/api/ingest/text", json={"text": text}).json()
    for _ in range(50):
        sub = client.get(f"/api/ingest/{sub['id']}").json()
        if sub["status"] != "processing":
            break
        time.sleep(0.1)
    return sub


def _run(client, sub, mode="triage"):
    panel = client.get("/api/panels").json()[0]
    run = client.post(
        "/api/runs", json={"submission_id": sub["id"], "panel_id": panel["id"], "mode": mode}
    ).json()
    for _ in range(100):
        run = client.get(f"/api/runs/{run['id']}").json()
        if run["status"] in ("done", "failed"):
            break
        time.sleep(0.1)
    return run


def test_health(client):
    assert client.get("/health").json()["ok"]


def test_presets_seeded(client):
    panels = client.get("/api/panels").json()
    assert len(panels) >= 4
    assert all(p["is_preset"] for p in panels[:4])


def test_tier2_panel_cast_has_18_profiles(client):
    panels = client.get("/api/panels").json()
    tier2 = next(p for p in panels if "Tier-2 Hindi" in p["name"])
    cast = client.get(f"/api/panels/{tier2['id']}/cast").json()
    assert len(cast) == 18
    groups = {entry["group_label"] for entry in cast}
    assert "Critic" in groups
    assert sum(1 for entry in cast if entry["group_label"] == "Critic") == 2
    for entry in cast:
        assert entry.get("persona_prompt"), f"missing persona_prompt for {entry['handle']}"
        assert len(entry["persona_prompt"]) > 40

def test_ingest_builds_story_rep(client):
    sub = _ingest(client)
    assert sub["status"] == "ready"
    assert len(sub["story_rep"]["beats"]) >= 1
    assert all("text_span" in b for b in sub["story_rep"]["beats"])  # FR-1.4 schema


def test_byline_stripped(client):
    sub = _ingest(client, "By: Ramesh Kumar\n" + STORY)
    joined = " ".join(b["text_span"] for b in sub["story_rep"]["beats"])
    assert "Ramesh" not in joined  # FR-1.5


def test_list_runs(client):
    sub = _ingest(client)
    run = _run(client, sub)
    rows = client.get("/api/runs").json()
    assert isinstance(rows, list)
    assert len(rows) >= 1
    match = next(r for r in rows if r["id"] == run["id"])
    assert match["status"] == "done"
    assert match["submission_id"] == sub["id"]
    assert match["panel_id"] == run["panel_id"]
    assert match["mode"] == run["mode"]
    assert match["score"] is not None
    assert 0 <= match["score"] <= 10
    assert 5 <= match["persona_count"] <= 50
    assert match["beat_count"] == len(sub["story_rep"]["beats"])
    assert match["language"] == sub["story_rep"]["language"]
    assert match["story_label"]
    assert match["panel_name"]
    assert match["started_at"] is not None
    assert match["finished_at"] is not None
    started = [r["started_at"] for r in rows if r["started_at"]]
    assert started == sorted(started, reverse=True)


def test_full_run_and_report(client):
    sub = _ingest(client)
    run = _run(client, sub)
    assert run["status"] == "done"
    rep = client.get(f"/api/runs/{run['id']}/report").json()
    assert 0 <= rep["score"] <= 10
    assert rep["dropoff"] and rep["segments"] and rep["fixes"]
    assert rep["confidence_note"]  # FR-6.2: always present
    assert rep["beat_engagement"]
    assert len(rep["beat_engagement"]) == len(rep["dropoff"])
    assert "posts" in rep["beat_engagement"][0]


def test_export_packet(client):
    sub = _ingest(client)
    run = _run(client, sub)
    md = client.get(f"/api/runs/{run['id']}/report/export").text
    assert md.startswith("# Story Feedback Packet")
    assert "cost" not in md.lower()  # FR-4.6: no internal data


def test_chat_report_agent(client):
    sub = _ingest(client)
    run = _run(client, sub)
    out = client.post(f"/api/runs/{run['id']}/chat", json={"message": "why?"}).json()
    assert out["content"]
    hist = client.get(f"/api/runs/{run['id']}/chat").json()
    assert len(hist) == 2  # editor + agent


def test_validation_errors(client):
    assert client.post("/api/ingest/text", json={"text": ""}).status_code == 422
    assert client.get("/api/runs/nope").status_code == 404
    r = client.post("/api/runs", json={"submission_id": "nope", "panel_id": "x", "mode": "triage"})
    assert r.status_code == 404


def test_no_author_columns():
    """Content-not-creator: structural audit (NFR-7).

    `editors` (staff login, its `username`) is excluded by design: it is the
    auth table, holds no FK to content, and no content table references it —
    the audit covers every table that touches submissions/judgment.
    """
    from app import models

    cols = [
        c.name
        for t in models.Base.metadata.tables.values()
        if t.name != "editors"
        for c in t.columns
    ]
    assert not [x for x in cols if "author" in x or "writer" in x or "user" in x]
    # editors must stay an island: no FKs in either direction
    editors = models.Base.metadata.tables["editors"]
    assert not editors.foreign_keys
    assert not [
        fk
        for t in models.Base.metadata.tables.values()
        for fk in t.foreign_keys
        if fk.column.table.name == "editors"
    ]
