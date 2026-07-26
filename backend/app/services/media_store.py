"""Where uploaded media lives.

Two backends, chosen by config:

- **Mounted disk** (``MEDIA_DIR``, e.g. a Railway volume at /data/media) — lets a
  cloud deploy store uploads without shipping Databricks credentials to that host.
- **Unity Catalog Volume** — the lakehouse mirror, used when MEDIA_DIR is unset.

Both return a path string that is recorded on the Submission, so the TTL sweep can
delete the blob later regardless of which backend wrote it (NFR-7).
"""
import logging
import os
import pathlib

from app.services import lakehouse

log = logging.getLogger(__name__)

_DISK_PREFIX = "file://"


def _media_dir() -> str:
    return os.getenv("MEDIA_DIR", "")


def put(content_hash: str, suffix: str, data: bytes) -> str | None:
    """Store an upload. Returns a path to record, or None when storage is off."""
    directory = _media_dir()
    if not directory:
        return lakehouse.put_raw_file(content_hash, suffix, data)
    try:
        target = pathlib.Path(directory)
        target.mkdir(parents=True, exist_ok=True)
        blob = target / f"{content_hash}.{suffix}"
        blob.write_bytes(data)
        log.info("media: wrote %s (%d bytes)", blob, len(data))
        return f"{_DISK_PREFIX}{blob}"
    except Exception:  # noqa: BLE001 — storage must never break ingest (NFR-6)
        log.exception("media write failed (non-fatal)")
        return None


def delete(path: str) -> None:
    """Remove a stored upload, whichever backend holds it."""
    if not path.startswith(_DISK_PREFIX):
        lakehouse.delete_raw_file(path)
        return
    try:
        pathlib.Path(path[len(_DISK_PREFIX) :]).unlink(missing_ok=True)
        log.info("media: deleted %s", path)
    except Exception:  # noqa: BLE001
        log.exception("media delete failed (non-fatal)")
