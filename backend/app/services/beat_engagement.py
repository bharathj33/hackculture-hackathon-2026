"""Derive per-beat swarm discourse stats from retention + persona event logs.

MiroFish timeline is not persisted today; these numbers are a deterministic
estimate grounded in drop-off and listener traces (NFR-3 traceability).
"""

from collections import defaultdict


def _persona_name(persona) -> str:
    prof = persona.profile if hasattr(persona, "profile") else persona.get("profile", {})
    if isinstance(prof, dict):
        return prof.get("name") or getattr(persona, "id", persona.get("id", "agent"))
    return str(getattr(persona, "id", persona.get("id", "agent")))


def derive_beat_engagement(
    dropoff: list[dict],
    personas: list,
    panel_config: dict,
    beats_meta: dict[int, dict] | None = None,
) -> list[dict]:
    """Return [{beat_idx, posts, comments, reactions, tweets, agents_engaged, silences}]."""
    beats_meta = beats_meta or {}
    persona_count = int(panel_config.get("persona_count", 20))
    critic_n = len(panel_config.get("critic_archetypes") or [])
    agent_ceiling = persona_count + critic_n

    posts_by: dict[int, int] = defaultdict(int)
    comments_by: dict[int, int] = defaultdict(int)
    engaged_by: dict[int, set[str]] = defaultdict(set)

    for persona in personas:
        name = _persona_name(persona)
        log = persona.event_log if hasattr(persona, "event_log") else persona.get("event_log", [])
        for ev in log or []:
            idx = int(ev.get("beat_idx", 0))
            action = str(ev.get("action", "")).lower()
            engaged_by[idx].add(name)
            if action in ("reacted", "continued", "listening"):
                posts_by[idx] += 1
                comments_by[idx] += 1
            elif action in ("dropped", "skipped"):
                comments_by[idx] += 2

    out: list[dict] = []
    for point in sorted(dropoff, key=lambda d: int(d.get("beat_idx", 0))):
        idx = int(point["beat_idx"])
        retained = float(point.get("retained_pct", 100))
        if retained <= 1.0:
            retained *= 100
        retained_frac = max(0.0, min(1.0, retained / 100.0))
        cliff = bool(point.get("cliff", False))
        meta = beats_meta.get(idx, {})
        is_hook = bool(meta.get("is_hook", False))
        is_cliff = bool(meta.get("is_cliffhanger", False))

        base = max(1, round(agent_ceiling * 0.12 * retained_frac))
        posts = posts_by[idx] or base + (3 if is_hook else 0) + (2 if is_cliff else 0)
        comments = comments_by[idx] or round(base * 1.35) + (4 if cliff else 0)
        reactions = round(posts * 1.6 + comments * 0.75)
        tweets = round(base * 0.45) if agent_ceiling >= 12 else 0
        agents = len(engaged_by[idx]) or max(1, round(agent_ceiling * retained_frac * 0.55))
        silences = max(0, agent_ceiling - agents - round(agent_ceiling * (1 - retained_frac) * 0.35))

        out.append(
            {
                "beat_idx": idx,
                "posts": int(posts),
                "comments": int(comments),
                "reactions": int(reactions),
                "tweets": int(tweets),
                "agents_engaged": int(min(agents, agent_ceiling)),
                "silences": int(silences),
            }
        )
    return out


def sum_engagement(rows: list[dict]) -> dict:
    keys = ("posts", "comments", "reactions", "tweets", "agents_engaged", "silences")
    totals = {k: sum(int(r.get(k, 0)) for r in rows) for k in keys}
    totals["beats"] = len(rows)
    return totals
