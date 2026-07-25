"""F5 — interrogation. Works even without MiroFish: persona event logs + profile
are in our DB, so chat can run as a plain LLM roleplay grounded in stored state.
(That grounding is what keeps answers traceable — NFR-3.)
"""
import json

from openai import OpenAI
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Persona, Report, Run


def ask(db: Session, run: Run, persona: Persona | None, message: str) -> str:
    if get_settings().demo_mock:
        who = persona.profile.get("name", persona.group_label) if persona else "report agent"
        return f"[MOCK {who}] I lost interest at the midpoint — the twist was guessable. (Echo: {message[:60]})"
    client = OpenAI(api_key=get_settings().openai_api_key)

    if persona is not None:
        # FR-5.1 — roleplay THE stored persona, grounded in its event log
        system = (
            "You are a simulated audio-drama listener. Stay in character; answer "
            "from your profile and event log ONLY — no invented events.\n"
            f"Profile: {json.dumps(persona.profile)}\n"
            f"Event log: {json.dumps(persona.event_log)}\n"
            f"Dropped at beat: {persona.dropped_at_beat}"
        )
    else:
        # FR-5.2 — report agent, grounded in the verdict report
        report = db.get(Report, run.id)
        system = (
            "You are the report agent for a story-critique simulation. Answer "
            "aggregate questions grounded ONLY in this report.\n"
            f"Report: {json.dumps({'score': report.score, 'rationale': report.rationale, 'pros': report.pros, 'cons': report.cons, 'dropoff': report.dropoff, 'segments': report.segments, 'fixes': report.fixes})}"
        )

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": system}, {"role": "user", "content": message}],
    )
    return resp.choices[0].message.content or ""
