from app.services.listener_identity import build_panel_cast, cast_by_handle, seed_block


TIER2 = {
    "persona_count": 16,
    "genre_affinities": ["romance", "thriller"],
    "habits": ["binge", "daily-commute", "completionist"],
    "market": "IN",
    "language": "hi",
    "critic_archetypes": ["Story editor", "Pacing analyst"],
}


def test_cast_includes_persona_prompt():
    cast = build_panel_cast(TIER2)
    assert len(cast) == 18
    fan = next(c for c in cast if c["handle"] == "Asha-L00")
    assert "persona_prompt" in fan
    assert "Asha-L00" in fan["persona_prompt"]
    assert "Stay in character" in fan["persona_prompt"]


def test_seed_block_includes_prompt_section():
    entry = cast_by_handle(TIER2)["Asha-L00"]
    md = seed_block(entry)
    assert "### Persona prompt" in md
    assert entry["persona_prompt"] in md


def test_critic_prompt_is_professional():
    critic = cast_by_handle(TIER2)["Story editor"]
    assert critic["group_label"] == "Critic"
    assert "story editor" in critic["persona_prompt"].lower()
    assert "not an audience member" in critic["persona_prompt"].lower()
