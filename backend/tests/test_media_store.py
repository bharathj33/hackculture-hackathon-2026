"""Media storage (UC Volume mirror) — upload wiring, TTL parity, no-op default.

These run without Databricks credentials: the SDK client is faked, which is also
what catches contract slips like passing bytes where a stream is required.
"""
import io
import os

os.environ["DEMO_MOCK"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///./test_media.db"

import pytest

from app.services import lakehouse


class FakeFiles:
    """Stands in for w.files, enforcing the real SDK's stream-not-bytes contract."""

    def __init__(self):
        self.stored: dict[str, bytes] = {}

    def upload(self, path, contents, overwrite=False):
        if not hasattr(contents, "read"):  # the real SDK calls contents.seekable()
            raise AttributeError("'bytes' object has no attribute 'seekable'")
        self.stored[path] = contents.read()

    def delete(self, path):
        self.stored.pop(path, None)


class FakeClient:
    def __init__(self):
        self.files = FakeFiles()


@pytest.fixture(autouse=True)
def fresh_db():
    """The engine binds to a DB file at import, and test_e2e deletes its own file at
    teardown — dispose the pool so SQLite recreates it instead of failing read-only."""
    from app.db import engine, init_db

    engine.dispose()
    init_db()


@pytest.fixture
def volume(monkeypatch):
    client = FakeClient()
    monkeypatch.setattr(lakehouse, "_client", lambda: client)
    monkeypatch.setenv("MIRROR_RAW_CONTENT", "true")
    return client.files


def test_upload_returns_path_and_stores_bytes(volume):
    data = b"\x00\x01fake-mp3-bytes"
    path = lakehouse.put_raw_file("abc123", "mp3", data)

    assert path == "/Volumes/storycritic/raw/uploads/abc123.mp3"
    assert volume.stored[path] == data  # byte-identical: replay depends on it


def test_delete_removes_blob(volume):
    path = lakehouse.put_raw_file("abc123", "mp3", b"x")
    lakehouse.delete_raw_file(path)

    assert volume.stored == {}


def test_disabled_by_default_stores_nothing(monkeypatch):
    client = FakeClient()
    monkeypatch.setattr(lakehouse, "_client", lambda: client)
    monkeypatch.delenv("MIRROR_RAW_CONTENT", raising=False)

    assert lakehouse.put_raw_file("abc123", "mp3", b"x") is None
    assert client.files.stored == {}


def test_upload_failure_is_non_fatal(volume, monkeypatch):
    """NFR-6: the mirror must never break ingest."""
    monkeypatch.setattr(
        volume, "upload", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("volume down"))
    )

    assert lakehouse.put_raw_file("abc123", "mp3", b"x") is None


def test_media_survives_failed_transcription(volume, monkeypatch):
    """The reason to store media at all: a failed run stays replayable."""
    import hashlib

    from app.db import SessionLocal, init_db
    from app.models import Submission
    from app.services.preprocess import audio as audio_svc

    init_db()
    data = b"fake-audio"
    db = SessionLocal()
    sub = Submission(
        content_hash=hashlib.sha256(data).hexdigest(), media_type="audio", status="processing"
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    sid = sub.id
    db.close()

    monkeypatch.setattr(
        audio_svc, "transcribe", lambda b: (_ for _ in ()).throw(RuntimeError("ASR down"))
    )
    audio_svc.transcribe_task(sid, data, "audio", "mp3")

    db = SessionLocal()
    sub = db.get(Submission, sid)
    assert sub.status == "failed"
    assert sub.media_path is not None
    assert volume.stored[sub.media_path] == data
    db.close()


def test_purge_deletes_blob_with_transcript(volume):
    """NFR-7: the blob must not outlive raw_text."""
    import hashlib
    from datetime import datetime, timedelta, timezone

    from app.db import SessionLocal, init_db
    from app.main import purge_expired_content
    from app.models import Submission

    init_db()
    data = b"old-audio"
    path = lakehouse.put_raw_file(hashlib.sha256(data).hexdigest(), "mp3", data)

    db = SessionLocal()
    sub = Submission(
        content_hash="stale",
        media_type="audio",
        status="ready",
        raw_text="transcript",
        media_path=path,
        created_at=datetime.now(timezone.utc) - timedelta(days=30),
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    sid = sub.id
    db.close()

    purge_expired_content()

    db = SessionLocal()
    sub = db.get(Submission, sid)
    assert sub.raw_text is None
    assert sub.media_path is None
    assert volume.stored == {}  # blob gone from the Volume, not just unlinked
    db.close()


def test_disk_backend_round_trips(tmp_path, monkeypatch):
    """MEDIA_DIR (a mounted volume) stores media without Databricks credentials."""
    from app.services import media_store

    monkeypatch.setenv("MEDIA_DIR", str(tmp_path))
    data = b"\x00\x01audio-bytes"

    path = media_store.put("abc123", "mp3", data)

    assert path == f"file://{tmp_path}/abc123.mp3"
    assert (tmp_path / "abc123.mp3").read_bytes() == data

    media_store.delete(path)
    assert not (tmp_path / "abc123.mp3").exists()


def test_disk_backend_preferred_over_lakehouse(tmp_path, monkeypatch, volume):
    """With MEDIA_DIR set, nothing is sent to the Unity Catalog Volume."""
    from app.services import media_store

    monkeypatch.setenv("MEDIA_DIR", str(tmp_path))

    media_store.put("abc123", "mp3", b"x")

    assert volume.stored == {}


def test_delete_routes_by_path_scheme(volume, monkeypatch):
    """A UC path must not be handed to the disk backend, or vice versa."""
    from app.services import media_store

    monkeypatch.delenv("MEDIA_DIR", raising=False)
    uc_path = media_store.put("abc123", "mp3", b"x")

    media_store.delete(uc_path)  # routes to lakehouse despite MEDIA_DIR being unset
    assert volume.stored == {}


def teardown_module():
    if os.path.exists("test_media.db"):
        os.remove("test_media.db")
