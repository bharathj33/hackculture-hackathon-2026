"""FR-4.6 — writer-facing feedback packet. Excludes cost/internal data by design."""
from app.models import Report


def report_to_markdown(report: Report) -> str:
    # Defensive .get() throughout — pros/cons/fixes/dropoff come from LLM JSON;
    # a missing key must not crash the export mid-demo.
    def _pct(v) -> str:
        try:
            return f"{float(v):.0f}"
        except (TypeError, ValueError):
            return "?"

    lines = [
        "# Story Feedback Packet",
        "",
        f"**Score:** {report.score}/10",
        "",
        report.rationale or "",
        "",
        "## What lands",
        *[f"- {p.get('text', '')}" for p in report.pros or []],
        "",
        "## What doesn't",
        *[f"- {c.get('text', '')}" for c in report.cons or []],
        "",
        "## Priority fixes",
        *[
            f"{f.get('priority', i + 1)}. {f.get('text', '')} _(est. impact: {f.get('est_delta', 'n/a')})_"
            for i, f in enumerate(report.fixes or [])
        ],
        "",
        "## Predicted drop-off points",
        *[
            f"- Beat {d.get('beat_idx', '?')}: {_pct(d.get('retained_pct'))}% retained"
            + (f" — **cliff**: {d.get('cause') or ''}" if d.get("cliff") else "")
            for d in report.dropoff or []
        ],
        "",
        "---",
        f"_{report.confidence_note}_",
    ]
    return "\n".join(lines)
