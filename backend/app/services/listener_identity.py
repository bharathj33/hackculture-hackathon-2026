"""Shared listener/critic identity builder — cast API, MiroFish seed, and chat stay aligned."""

FIRST_NAMES = [
    "Asha", "Ravi", "Meena", "Kiran", "Divya", "Sanjay", "Pooja", "Amit",
    "Neha", "Vikram", "Lata", "Rohan", "Sunita", "Dev", "Priya", "Arjun",
    "Kavya", "Nikhil", "Rekha", "Suresh", "Tara", "Manoj", "Isha", "Gopal",
    "Zoya", "Harish", "Bina", "Yash", "Uma", "Farhan",
]
CITIES = ["Indore", "Lucknow", "Patna", "Jaipur", "Nagpur", "Surat", "Kanpur", "Bhopal"]

HABIT_GROUP: dict[str, str] = {
    "binge": "Fan",
    "daily-commute": "Casual listener",
    "commute": "Casual listener",
    "sampler": "Casual listener",
    "completionist": "Genre purist",
    "free-episodes-only": "Casual listener",
    "low-patience": "Casual listener",
    "long-form sessions": "Fan",
    "weekly episodic": "Casual listener",
    "pacing priority": "Critic",
}

GROUP_PROMPT: dict[str, str] = {
    "Fan": (
        "You binge serialized audio dramas and forgive slow pacing when character motivation "
        "stays honest. You drop when twists feel predictable or when a protagonist acts out of "
        "character without earning the change. Reward earned reversals and emotional payoffs."
    ),
    "Casual listener": (
        "You listen on a commute, often at 1.5× speed. You need a hook in the first minute and "
        "punish long exposition or monologues. You quit when dialogue turns into lectures or "
        "when the plot stalls without forward motion."
    ),
    "Genre purist": (
        "You came for the advertised genre and punish tonal drift when another thread hijacks "
        "the A-plot. You reward precise genre beats and earned reversals; you drop when the "
        "story feels like a different show than the one you tuned in for."
    ),
    # Habit-derived critics (e.g. habit "pacing priority") land here. Without this entry
    # they were labelled Critic in segments while being prompted as casual commuters —
    # the label and the behaviour have to come from the same place.
    "Critic": (
        "You listen analytically, tracking momentum beat to beat and episode to episode. "
        "You notice when tension dissipates across a cliffhanger, when a reversal lacks "
        "runway, and when a scene runs past its purpose. You drop when motivation is "
        "unearned or when plot convenience replaces character choice, and you say which "
        "beat lost you."
    ),
}

CRITIC_PROMPTS: dict[str, str] = {
    "story editor": (
        "You are a professional story editor, not an audience member. Evaluate structure, "
        "character arcs, and setup/payoff. Exit when motivation is unearned or when plot "
        "convenience replaces character choice."
    ),
    "pacing analyst": (
        "You are a pacing analyst, not an audience member. Track beat-to-beat momentum, "
        "episode boundaries, and tension curves. Flag when energy dissipates across a cliff "
        "or when a reversal lacks runway."
    ),
}


def group_for_habit(habit: str) -> str:
    return HABIT_GROUP.get(habit.lower(), "Casual listener")


def _listener_prompt(
    handle: str,
    age: int,
    city: str,
    market: str,
    lang: str,
    genre: str,
    habit: str,
    group_label: str,
) -> str:
    archetype = GROUP_PROMPT.get(group_label, GROUP_PROMPT["Casual listener"])
    return (
        f"You are {handle}, a {age}-year-old listener in {city} (market {market}, language {lang}). "
        f"Favorite genre: {genre}; listening habit: {habit}. {archetype} "
        "Stay in character. Answer only from what you would have heard in the story — "
        "cite beat numbers when explaining drop-off or praise."
    )


def _critic_prompt(arch: str) -> str:
    key = arch.lower().strip()
    body = CRITIC_PROMPTS.get(key, (
        f"You are a professional {arch} evaluating the story (labeled critic, not audience). "
        "Judge plausibility, motivation, and craft — not fandom."
    ))
    return f"You are {arch}. {body} Stay in character as a critic, not a fan."


def build_listener(i: int, panel_config: dict) -> dict:
    """One listener identity — index i within persona_count."""
    genres = panel_config.get("genre_affinities") or ["general"]
    habits = panel_config.get("habits") or ["casual"]
    market = panel_config.get("market", "IN")
    lang = panel_config.get("language", "hi")

    handle = f"{FIRST_NAMES[i % len(FIRST_NAMES)]}-L{i:02d}"
    age = 18 + (i * 7) % 40
    city = CITIES[i % len(CITIES)]
    genre = genres[i % len(genres)]
    habit = habits[i % len(habits)]
    group_label = group_for_habit(habit)
    summary = (
        f"{handle}, {age}, lives in {city} (market {market}, language {lang}). "
        f"Favorite genre: {genre}; listening habit: {habit}. "
        f"Follows serialized audio dramas episode by episode and quits when "
        f"bored, confused, or when a twist feels predictable."
    )
    persona_prompt = _listener_prompt(handle, age, city, market, lang, genre, habit, group_label)

    return {
        "id": f"cast-{i:02d}",
        "handle": handle,
        "group_label": group_label,
        "profile": summary,
        "persona_prompt": persona_prompt,
        "interests": [genre, habit.replace("-", " "), market],
    }


def build_critic(arch: str) -> dict:
    slug = arch.lower().replace(" ", "-")
    summary = f"A professional {arch} evaluating the story (labeled critic, not audience)."
    return {
        "id": f"critic-{slug}",
        "handle": arch,
        "group_label": "Critic",
        "profile": summary,
        "persona_prompt": _critic_prompt(arch),
        "interests": ["Pacing", "Motivation", "Plausibility"],
    }


def build_panel_cast(panel_config: dict) -> list[dict]:
    """Cast roster for a panel — listeners plus critic_archetypes."""
    n = panel_config.get("persona_count", 20)
    cast = [build_listener(i, panel_config) for i in range(n)]
    for arch in panel_config.get("critic_archetypes") or []:
        cast.append(build_critic(arch))
    return cast


def cast_by_handle(panel_config: dict) -> dict[str, dict]:
    """Lookup map keyed by listener/critic handle."""
    return {entry["handle"]: entry for entry in build_panel_cast(panel_config)}


def seed_block(entry: dict) -> str:
    """Markdown block for one cast member in MiroFish seed.md."""
    kind = "Critic" if entry["group_label"] == "Critic" else "Listener"
    lines = [
        f"## {kind} {entry['handle']}",
        entry["profile"],
        "",
        "### Persona prompt",
        entry["persona_prompt"],
        "",
    ]
    return "\n".join(lines)
