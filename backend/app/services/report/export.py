"""FR-4.6 — writer-facing feedback packet. Excludes cost/internal data by design."""
from app.models import Report


def report_to_markdown(report: Report) -> str:
    lines = [
        "# Story Feedback Packet",
        "",
        f"**Score:** {report.score}/10",
        "",
        report.rationale,
        "",
        "## What lands",
        *[f"- {p['text']}" for p in report.pros],
        "",
        "## What doesn't",
        *[f"- {c['text']}" for c in report.cons],
        "",
        "## Priority fixes",
        *[f"{f['priority']}. {f['text']} _(est. impact: {f['est_delta']})_" for f in report.fixes],
        "",
        "## Predicted drop-off points",
        *[
            f"- Beat {d['beat_idx']}: {d['retained_pct']:.0f}% retained"
            + (f" — **cliff**: {d.get('cause', '')}" if d.get("cliff") else "")
            for d in report.dropoff
        ],
        "",
        "---",
        f"_{report.confidence_note}_",
    ]
    return "\n".join(lines)
