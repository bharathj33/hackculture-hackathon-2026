"""Latin-only display labels for editorial UI — never Devanagari in chrome."""

import re

_DEVANAGARI = re.compile(r"[\u0900-\u097F]")


def is_latin_display(text: str) -> bool:
    text = (text or "").strip()
    return bool(text) and _DEVANAGARI.search(text) is None


def truncate_label(text: str, max_len: int = 72) -> str:
    text = text.strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 1] + "…"


def pick_story_label(story_rep: dict | None, panel_config: dict | None = None) -> str:
    """First Latin beat summary, else language · beat count."""
    rep = story_rep or {}
    panel_config = panel_config or {}
    language = str(rep.get("language") or panel_config.get("language", "hi"))
    beats = rep.get("beats") or []
    for beat in beats:
        summary = (beat.get("summary") or "").strip()
        if is_latin_display(summary):
            return truncate_label(summary)
    n = len(beats)
    if n:
        return f"{language.upper()} · {n} beats"
    return language.upper()
