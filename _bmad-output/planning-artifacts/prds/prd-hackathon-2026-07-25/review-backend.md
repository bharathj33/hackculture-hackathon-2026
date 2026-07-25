# Backend FastAPI Code Review — StoryCritic

- **Scope:** `/Users/jsphdnl/jsstech/hackathon/backend/app/` (13 source files, all read in full)
- **Reviewer lens:** senior FastAPI review via `fastapi-code-review` skill; demo-breaking bugs prioritized over style
- **Context honored:** SQLite, open CORS, no auth, and BackgroundTasks-as-queue are accepted and not flagged per se
- **Date:** 2026-07-25

## Verdict

**Conditionally demo-ready.** The FastAPI mechanics are solid — correct `Depends(get_db)` yield-dependency cleanup, `response_model` on every route, and (notably) every background task takes an ID and opens its own `SessionLocal` with `try/finally close`, so there are **no session leaks across BackgroundTasks**. Sync (`def`) handlers are the right call given sync SQLAlchemy + sync OpenAI SDK (they run in the threadpool, never blocking the event loop).

Two things need attention before the live demo: **(H1)** three unbounded polling loops in the MiroFish client can pin a run at "running" forever with no recovery path, and **(H2)** the hard "no writer identity" constraint holds at the schema level but has two implementation gaps (unimplemented byline stripping that the docstrings claim exists; raw content mirrored to Databricks outliving the TTL purge).

---

## HIGH

### H1 — Unbounded `while True` polling loops can hang a run forever (demo-breaking)

`/Users/jsphdnl/jsstech/hackathon/backend/app/services/simulation/mirofish_client.py`

Three polling loops have **no deadline**:

- `_sim_prepare` (lines 161–168) — exits only on `ready`/`completed`/`failed`
- `_report_generate` (lines 197–203) — exits only on `completed`/`already_completed`/`failed`
- `_poll_task` (lines 221–228) — exits only on `completed`/`failed`

`_wait_run` correctly has a `timeout_s=1800` deadline; these three don't. If MiroFish ever returns a status outside the handled set (`stopped`, `cancelled`, a GC'd task record, a missing `status` key returning `None`), the background thread spins forever. Consequences on stage:

1. The run stays `running` indefinitely — the frontend spinner never resolves and there is **no cancel/timeout/recovery endpoint**.
2. The threadpool thread is leaked for the process lifetime.

**Fix (10 min):** copy the `deadline = time.time() + timeout_s` pattern from `_wait_run` into all three loops and raise `MiroFishError` on expiry. `execute_run_task`'s outer `except` will then correctly mark the run `failed` instead of hanging.

**Related in same file:** `_ok` (line 129) calls `r.json()` unguarded — a 502/HTML page from a proxy raises `JSONDecodeError`, which is *not* `MiroFishError`. Inside the polling loops one transient non-JSON response kills the run rather than retrying; in `_get_timeline`/`_get_profiles` it escapes the `except MiroFishError` guards. Wrap `_ok` body parsing and re-raise as `MiroFishError`.

### H2 — "No writer identity" constraint: schema is clean, but two implementation gaps

**Verified clean:** no author/writer/user identifier column in any table in `/Users/jsphdnl/jsstech/hackathon/backend/app/models.py` (Panel, Submission, Run, Report, Persona, ChatMessage — confirmed by read + grep). `file.filename` is used only for extension sniffing and never stored (`ingest.py:39`). `pdf_to_text` extracts text only, dropping PDF author metadata (`story_rep.py:59-68`). ChatMessage has a `role` string, no user id. Lakehouse rows are keyed by `content_hash` only.

**Gap (a) — claimed byline stripping is not implemented.** `models.py:41` states: *"FR-1.5: ingest strips filename/PDF-author/byline before this row is created."* No byline stripping exists anywhere. `ingest_text` (`ingest.py:24`) stores `body.text` verbatim; a txt/md/pdf whose text begins "by Jane Doe" persists that byline in `submissions.raw_text`, feeds it into the story-rep LLM call, and mirrors it to Databricks. The constraint is documented as mechanically auditable — this docstring/behavior mismatch is exactly what an auditor would catch. Either implement a cheap first-N-lines byline scrub in `ingest_text`, or correct the docstrings to say only filename/PDF-metadata are stripped.

**Gap (b) — lakehouse mirror defeats the TTL purge.** NFR-7 makes raw content session-scoped: `purge_expired_content` (`main.py:36-52`) nulls `raw_text` after 120 min. But `lakehouse.put_raw_file` (`ingest.py:29` → `lakehouse.py:33-43`) uploads the **full raw text** to a persistent Unity Catalog volume keyed by `content_hash`, and nothing ever purges it. Raw content outlives its TTL indefinitely on the sponsor side. If NFR-7 is a real promise, either stop mirroring raw text (mirror `story_rep` instead) or add the volume to the purge path.

---

## MEDIUM

### M1 — Chat endpoint: user message lost + 500 on LLM failure; no OpenAI timeout

`/Users/jsphdnl/jsstech/hackathon/backend/app/routers/chat.py:25-33`

The editor message is `db.add`ed, then `interrogate.ask` makes a network LLM call, then commit. If OpenAI errors (rate limit, bad key, timeout), the request 500s and the uncommitted editor message is rolled back — the transcript silently loses the question, and demo retries compound it. Also `interrogate.ask` creates `OpenAI(...)` with no `timeout`/`max_retries` override (SDK default timeout is 600 s) — a stalled call holds a threadpool request thread for up to 10 minutes. Fix: commit the editor message first; wrap `ask` in try/except returning a graceful "agent unavailable" answer; pass `timeout=30` to the OpenAI client here and in `story_rep.py`/`runner.py`.

### M2 — No automatic triage fallback despite it being the designed fallback

`/Users/jsphdnl/jsstech/hackathon/backend/app/services/simulation/runner.py:42-51`

The module docstring calls triage "also the R2 fallback" and `_run_full`'s docstring says "Fallback if MiroFish frame distorts" — but no fallback is wired. Any `MiroFishError` (server down, hang-timeout once H1 is fixed, transform KeyError) marks the run `failed` and the demo dead-ends; the cheap recovery path exists 20 lines above and is never called. One-line insurance in `execute_run_task`: on exception in `_run_full`, log and retry via `_run_triage` before declaring failure.

### M3 — Audio/video `content_hash` is a hash of the byte-*length*, and text hash isn't normalized

`/Users/jsphdnl/jsstech/hackathon/backend/app/routers/ingest.py:50` — `content_hash=_hash(str(len(data)))`: two different audio files of equal byte length collide. It is overwritten with the transcript hash in `transcribe_task` (`audio.py:59`), but if transcription fails the bogus hash persists — and `content_hash` is the *long-lived* key for runs, backtests, and lakehouse gold tables (it's what survives the purge). Hash `data` itself as the placeholder.

Also, `models.py:48` documents `content_hash` as "sha256 of normalized text", but `_hash` (`ingest.py:17-18`) does no normalization — the same story resubmitted with whitespace/line-ending differences gets a new hash, silently breaking content-keyed dedup/backtest joins.

### M4 — TTL purge runs only at process startup

`/Users/jsphdnl/jsstech/hackathon/backend/app/main.py:59` — `purge_expired_content()` is called once in lifespan (comment acknowledges "cron/loop later"). During an all-day demo with the server up continuously, the 120-minute NFR-7 TTL is never enforced. A ~10-line `asyncio.create_task` loop in lifespan (sleep 10 min, `run_in_threadpool(purge_expired_content)`) closes the gap.

---

## LOW (9)

1. **`httpx.Client` never closed** — `MiroFishClient` (`mirofish_client.py:43`) opens a client per run and never closes it; connection leak per full run. Use it as a context manager in `_run_full` or add `close()` in a `finally`.
2. **Strict `Literal` status in response schemas can 500 reads** — `SubmissionOut.status` / `RunOut.status` (`schemas.py:17,78`): any unexpected DB status value (e.g. a new status added mid-hack, or a legacy row) turns a simple GET into a `ResponseValidationError` 500. Plain `str` is safer for output models in a hackathon.
3. **`report_to_markdown` trusts LLM-shaped JSON** — `export.py:14-27`: `p['text']` / `f['priority']` KeyError → 500 on export; `retained_pct:.0f` assumes 0–100 while the LLM may return 0–1 fractions (packet shows "1% retained"). Cheap guard: `.get()` with defaults and scale-detect `retained_pct <= 1`.
4. **`_save_report`/`_transform` trust LLM JSON keys** (`runner.py:105-118`, `mirofish_client.py:258-260`) — missing keys raise KeyError; caught and marked `failed`, but validating through the existing Pydantic schemas (`ReportOut` fields) would give a retryable, diagnosable error instead.
5. **`ingest_file` calls the `ingest_text` endpoint function directly** (`ingest.py:44,47`) — works because deps are passed explicitly, but bypasses any future route-level middleware/validation on the text path. Extract a shared `_create_text_submission(db, bg, text)` helper when convenient.
6. **`chat_with_persona` is dead code** — `mirofish_client.py:73-80` is never called; `interrogate.py` never attempts the live OASIS interview the docstrings describe. Fine for demo; delete or wire post-hackathon.
7. **Naive `DateTime` columns store tz-aware datetimes** (`models.py`, `DateTime` without `timezone=True`) — works today because every write is `datetime.now(timezone.utc)` and SQLite string comparison stays consistent, but one naive datetime creeping in breaks the purge comparison silently. Use `DateTime(timezone=True)`.
8. **POST endpoints return 200, not 201/202** — `create_run`/`create_panel`/`ingest_*`. Style only; `202 Accepted` on `create_run` would better signal the async contract.
9. **`lakehouse.insert_row` builds SQL by string interpolation** (`lakehouse.py:57-62`) — `_sql_lit` escapes single quotes and no user-facing path reaches it, but parameterized statements via the SDK would be safer if this outlives the hackathon.

---

## Explicitly checked and NOT flagged (correct as written)

- **Session handling across BackgroundTasks** — the classic pitfall (passing a request-scoped `Session` into a background task that runs after `get_db` closes it) is **avoided everywhere**: `build_story_rep_task`, `transcribe_task`, and `execute_run_task` all receive IDs and open/close their own `SessionLocal` (`story_rep.py:39-56`, `audio.py:49-69`, `runner.py:30-55`).
- **Sync `def` handlers** — correct choice with sync SQLAlchemy + sync OpenAI; they run in the threadpool, so the event loop never blocks. Making them `async def` without async drivers would be the actual bug.
- **`time.sleep` polling in `mirofish_client`** — runs on a threadpool thread (sync background task), not the event loop; the problem is loop *boundedness* (H1), not the sleeps.
- **Threadpool capacity** — sync bg tasks and sync handlers share the default anyio pool (40 tokens); a full run occupies one thread for up to ~30 min, but the demo would need ~40 concurrent runs to starve requests. Not a realistic demo failure.
- **SQLite write-lock contention** — sessions use `autoflush=False` and commit in short windows; the long MiroFish phase holds only autocommitted reads, no write transaction. No realistic "database is locked" window for the demo.
- **Run-status races** — `create_run` commits before `bg.add_task`, and Starlette runs the task after the response; the runner re-reads the row in its own session. Status polling via `GET /api/runs/{id}` observes committed states only. Chat's `status == "done"` gate guarantees the Report row exists (it is inserted in the same transaction that sets `done`, `runner.py:47-53`).
- **`filter(Panel.is_preset)`** (`main.py:28`) — valid SQLAlchemy 2.0 boolean-column expression.
- **Chat router prefix with path param** (`/api/runs/{run_id}/chat`) — valid FastAPI pattern.

## Finding counts

| Severity | Count |
|----------|-------|
| High     | 2     |
| Medium   | 4     |
| Low      | 9     |

**Pre-demo punch list (≈1 hour):** H1 deadlines (+`_ok` JSON guard), M1 chat commit-first + LLM timeouts, M2 triage fallback, M3 placeholder hash. H2 needs a product decision (implement byline scrub / stop mirroring raw text, or amend the claims).
