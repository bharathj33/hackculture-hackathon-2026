from app.services.display_label import is_latin_display, pick_story_label


def test_rejects_devanagari_summary():
    assert not is_latin_display("शिप्रा पुलिस की मदद के लिए आती है")
    assert is_latin_display("Meera opens the door at night.")


def test_pick_story_label_skips_hindi_for_latin():
    rep = {
        "language": "hi",
        "beats": [
            {"summary": "शिप्रा पुलिस की मदद के लिए आती है"},
            {"summary": "Shipra arrives to help the police, but the beggar is arrested."},
        ],
    }
    assert pick_story_label(rep).startswith("Shipra")


def test_pick_story_label_fallback():
    rep = {"language": "hi", "beats": [{"summary": "हिंदी में"}]}
    assert pick_story_label(rep) == "HI · 1 beats"
