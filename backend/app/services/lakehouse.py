"""Databricks lakehouse mirror (sponsor integration) — see ETL-DATABRICKS.md.

Design: system-of-record MIRROR, never on the demo critical path (NFR-6).
Every function no-ops silently when DATABRICKS_HOST/TOKEN are unset or the SDK
is missing. NFR-7 applies here too: rows carry content_hash, never any author
identity.
"""
import io
import json
import logging

from app.config import get_settings

log = logging.getLogger(__name__)

CATALOG = "storycritic"


def _client():
    """Return WorkspaceClient or None (disabled)."""
    import os

    if not (os.getenv("DATABRICKS_HOST") and os.getenv("DATABRICKS_TOKEN")):
        return None
    try:
        from databricks.sdk import WorkspaceClient  # optional dep: uv add databricks-sdk

        return WorkspaceClient()
    except ImportError:
        log.warning("databricks-sdk not installed — lakehouse mirror disabled")
        return None


def put_raw_file(content_hash: str, suffix: str, data: bytes) -> str | None:
    """Mirror raw upload into Unity Catalog Volume (blob storage).

    Returns the Volume path on success, else None (disabled, no creds, or failure) —
    callers record it on the Submission so the blob can be found and purged later.

    Opt-in via MIRROR_RAW_CONTENT=true. The stored blob is deleted by the same TTL
    sweep that nulls raw_text, so it never outlives the transcript (NFR-7).
    """
    import os

    if os.getenv("MIRROR_RAW_CONTENT", "").lower() != "true":
        return None
    w = _client()
    if not w:
        return None
    try:
        path = f"/Volumes/{CATALOG}/raw/uploads/{content_hash}.{suffix}"
        w.files.upload(path, io.BytesIO(data), overwrite=True)  # SDK needs a stream, not bytes
        log.info("lakehouse: uploaded %s", path)
        return path
    except Exception:  # noqa: BLE001 — mirror must never break the demo path
        log.exception("lakehouse upload failed (non-fatal)")
        return None


def delete_raw_file(path: str) -> None:
    """Remove a mirrored upload (TTL purge, NFR-7)."""
    w = _client()
    if not w:
        return
    try:
        w.files.delete(path)
        log.info("lakehouse: deleted %s", path)
    except Exception:  # noqa: BLE001
        log.exception("lakehouse delete failed (non-fatal)")


def insert_row(table: str, row: dict) -> None:
    """Append one row to a Delta table via SQL warehouse statement API."""
    w = _client()
    if not w:
        return
    try:
        import os

        warehouse_id = os.getenv("DATABRICKS_WAREHOUSE_ID", "")
        if not warehouse_id:
            return
        cols = ", ".join(row.keys())
        vals = ", ".join(_sql_lit(v) for v in row.values())
        w.statement_execution.execute_statement(
            warehouse_id=warehouse_id,
            statement=f"INSERT INTO {CATALOG}.{table} ({cols}) VALUES ({vals})",
        )
        log.info("lakehouse: inserted into %s.%s", CATALOG, table)
    except Exception:  # noqa: BLE001
        log.exception("lakehouse insert failed (non-fatal)")


def _sql_lit(v) -> str:
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, (dict, list)):
        v = json.dumps(v)
    return "'" + str(v).replace("'", "''") + "'"


def mirror_verdict(run_id: str, content_hash: str, panel_id: str, report: dict) -> None:
    """Push verdict to gold tables (called after run completes)."""
    insert_row(
        "gold.verdicts",
        {
            "run_id": run_id,
            "content_hash": content_hash,
            "panel_id": panel_id,
            "score": report["score"],
            "dropoff": report["dropoff"],
            "segments": report["segments"],
            "fixes": report["fixes"],
            "confidence_note": report.get("confidence_note", ""),
        },
    )
    for d in report["dropoff"]:
        insert_row(
            "gold.dropoff_points",
            {
                "run_id": run_id,
                "beat_idx": d["beat_idx"],
                "retained_pct": d["retained_pct"],
                "cliff": d.get("cliff", False),
                "paywall_risk": d.get("paywall_risk", False),
            },
        )
