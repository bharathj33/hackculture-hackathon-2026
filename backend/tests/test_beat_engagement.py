from app.services.beat_engagement import derive_beat_engagement, sum_engagement


DROP = [
    {"beat_idx": 1, "retained_pct": 92, "cliff": False, "cause": None},
    {"beat_idx": 2, "retained_pct": 78, "cliff": True, "cause": "Predictable twist"},
]

BEATS = {1: {"is_hook": True}, 2: {"is_cliffhanger": True}}


def test_derive_beat_engagement_from_dropoff():
    rows = derive_beat_engagement(DROP, [], {"persona_count": 16, "critic_archetypes": ["Story editor"]}, BEATS)
    assert len(rows) == 2
    assert rows[0]["beat_idx"] == 1
    assert rows[0]["posts"] >= 1
    assert rows[1]["comments"] >= rows[0]["comments"]  # cliff drives debate


def test_sum_engagement():
    rows = derive_beat_engagement(DROP, [], {"persona_count": 10}, BEATS)
    totals = sum_engagement(rows)
    assert totals["beats"] == 2
    assert totals["posts"] == sum(r["posts"] for r in rows)
