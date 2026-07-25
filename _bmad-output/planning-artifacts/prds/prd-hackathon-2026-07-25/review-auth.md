# Adversarial Review — Editor JWT Auth Layer

**Date:** 2026-07-26 · **Scope:** 48-hour public hackathon demo (StoryCritic)
**Verdict: SHIP, after fixing H-1 (fail-open secret) — everything else is optional hardening or polish.**

Files reviewed:
- `backend/app/auth.py`, `backend/app/routers/auth.py`, `backend/app/config.py`, `backend/app/main.py`, `backend/app/models.py`, `backend/tests/test_auth.py`
- `frontend/src/api.ts`, `frontend/src/components/Login.tsx`, `frontend/src/App.tsx`

Calibration: CRITICAL = enables actual unauthorized API access. MEDIUM = demo-plausible abuse. NOTE = theoretical / accepted for a 2-day demo.

---

## What's solid (verified in code, not assumed)

- **No alg confusion.** `jwt.decode(..., algorithms=["HS256"])` (`auth.py:34-36`) pins the algorithm; `alg: none` and RS256-confusion tokens are rejected. Encode side is also pinned HS256 (`routers/auth.py:48`).
- **exp is validated.** PyJWT verifies `exp` by default when present, and every issued token includes it (`routers/auth.py:45`). Expiry test exists (`test_auth.py:99-107`).
- **Signature errors, garbage tokens, missing header all → 401** with `WWW-Authenticate: Bearer`. All covered by tests.
- **Every content router is gated.** Verified the full route inventory: `ingest`, `panels`, `runs`, `chat` routers are all included with `dependencies=[Depends(require_editor)]` (`main.py:130-135`). No `@app.get/post` endpoints exist besides `/health` (deliberately open). No WebSocket routes anywhere (`grep` over `app/routers/*`). `/api/auth/me` is gated directly via `Depends(require_editor)`.
- **No username enumeration via response body.** Same `401 "invalid credentials"` for unknown user and wrong password (`routers/auth.py:36-40`), tested.
- **Passwords bcrypt-hashed at boot, plaintext never stored** (`main.py:38-62`, `models.py` Editor: no FK to any content table — NFR-7 holds).
- **Login correctly 503s when auth is disabled** instead of minting unsigned/weak tokens (`routers/auth.py:32-34`).
- **CORS + Bearer is not a CSRF vector.** Token is in sessionStorage and attached explicitly — no cookies, `allow_credentials` not enabled. A malicious origin calling the API cross-site gets 401 (it cannot read the victim's sessionStorage). See N-4.
- **No XSS sinks found in the frontend** (`grep` for `dangerouslySetInnerHTML` / `innerHTML` / `eval` — zero hits). React's default escaping stands between LLM-generated report/chat text and the DOM.

---

## Findings

### HIGH

**H-1 — Fail-open auth: empty `JWT_SECRET` silently disables the entire gate.**
`auth.py:25-26` returns `"dev"` when `settings.jwt_secret` is falsy, and the default in `config.py:19` is `""`. If the prod deploy forgets to set `JWT_SECRET` (or sets it in the wrong service/environment), the public API is **completely open** — and the frontend probe (`App.tsx:112-125`) will happily render the full app with no login screen, so nobody on the team will even notice. The local `.env` currently has **no** `JWT_SECRET` line, so the deployed value must come from platform env vars — exactly the kind of step that gets missed at 2 a.m. before a demo.

This is the only finding that can produce actual unauthorized access, and it's one misconfiguration away. Not CRITICAL as-written (code is correct when configured), but it deserves a guard:

```python
# main.py lifespan, after get_settings():
s = get_settings()
if s.auth_users and not s.jwt_secret:
    raise RuntimeError("AUTH_USERS set but JWT_SECRET empty — refusing to boot fail-open")
if not s.jwt_secret:
    logging.warning("AUTH DISABLED (JWT_SECRET empty) — do not expose publicly")
```

Three lines, converts a silent fail-open into a loud boot failure. **Do this before going public**, and eyeball the platform env vars once (`JWT_SECRET` ≥ 32 random bytes, `AUTH_USERS` with strong passwords).

### MEDIUM

**M-1 — Login is unthrottled; bcrypt is the only brake.**
No rate limit on `/api/auth/login`. bcrypt at default cost (~200-300ms/attempt, CPU-bound) plus a single uvicorn worker gives natural serialization to roughly a few attempts/sec — ~250-500k guesses over the 48-hour window if someone bothers. Against a 16+ char random password that's nothing; against `alice:wonderland`-grade passwords it's plenty. **Cheapest adequate mitigation: make `AUTH_USERS` passwords long and random (e.g. `openssl rand -base64 16` each) — zero code.** If you want code anyway, a 10-line in-memory counter (per-IP, sleep-on-failure) is proportionate; slowapi/redis is not, for 48 hours. Side effect worth knowing: a login flood also degrades the demo itself (bcrypt hogs the event-loop thread pool) — another reason for the trivial per-IP delay if you expect hostile traffic.

**M-2 — Expired/invalidated session strands the user in generic-error limbo.**
`request()` in `api.ts:47-63` clears the token and throws `UnauthorizedError` on any 401, but only the **mount-time probe** in `App.tsx` maps that to the login screen. If the 12h token expires mid-session (or the server restarts with a new secret), every subsequent action fails: `Upload`/`Running`/`PanelSelect` surface it as a generic error string, `unlocked` stays `true`, and the user must know to hard-refresh. No infinite loop (token is cleared, so no retry storm — verified), just a dead end. With `jwt_expiry_hours=12` this is unlikely to bite during a demo day, but a server redeploy mid-demo *would* trigger it. Cheap fix: in `App.tsx`, catch `UnauthorizedError` at the one place errors funnel through (or a tiny event/callback from `api.ts`) and `setUnlocked(false)`.

**M-3 — Username enumeration via timing on login.**
`routers/auth.py:35-39`: `if not editor or not bcrypt.checkpw(...)` short-circuits, so unknown users respond in ~5ms and known users in ~250ms (bcrypt). A stopwatch distinguishes valid usernames despite the identical 401 body — the code comment's "no username enumeration" claim is only half true. Impact for this demo is small (usernames alone don't grant access, and the account list is a handful of teammates), but the fix is three lines, so take it:

```python
_DUMMY_HASH = bcrypt.hashpw(b"timing-pad", bcrypt.gensalt()).decode()
# in login():
hash_to_check = editor.password_hash if editor else _DUMMY_HASH
if not editor or not bcrypt.checkpw(body.password.encode(), hash_to_check.encode()):
```

(Keep the `not editor or` so a dummy-hash match can never log in.)

### NOTE (theoretical / accepted)

**N-1 — Token in sessionStorage is XSS-readable.** Standard tradeoff. Acceptable here because: no HTML injection sinks exist (verified), the only untrusted-ish content is LLM output rendered through React escaping, tokens live ≤12h, and the blast radius is "editor access to a demo tool". Don't add cookie+CSRF machinery for this. Just don't add `dangerouslySetInnerHTML` (e.g. a markdown renderer for reports) without revisiting.

**N-2 — `exp` is validated but not *required*.** `jwt.decode` has no `options={"require": ["exp", "sub"]}`, so a token *without* an `exp` claim would verify forever, and one without `sub` would raise `KeyError` → 500 in `auth.py:43`. Both need a token signed with the real secret, which only the server produces — unreachable unless the secret leaks or a second signer appears. One-liner if you want it: `options={"require": ["exp", "sub"]}`.

**N-3 — No token revocation / logout is client-side only.** Stolen or leaked token is valid until expiry; the only kill switch is rotating `JWT_SECRET` (restarts included — that's fine, see M-2). Correct scope for a 2-day demo; noting so nobody mistakes "Sign out" for server-side invalidation.

**N-4 — `allow_origins=["*"]` actual risk: negligible here.** No cookies → no CSRF; gated endpoints 401 without a token; the wildcard merely lets arbitrary web pages make anonymous calls (health checks, login attempts) that curl could make anyway. It also means a compromised/malicious page can't do anything a public internet client can't. Tightening to the frontend origin is a nice-to-have, not a need — and note the frontend uses relative `/api` anyway, so same-origin serving makes CORS mostly moot.

**N-5 — `/docs` and `/openapi.json` are public.** Advertises the API surface to anyone who looks. For a hackathon that's arguably a feature. If judges shouldn't see it: `FastAPI(docs_url=None, redoc_url=None, openapi_url=None)` when `jwt_secret` is set.

**N-6 — Probe failure fails open in the UI (not the API).** `App.tsx:120`: a network error during the mount probe sets `unlocked=true`, rendering the app shell whose every call then errors. Pure UX; the API is still gated. Fine to leave.

**N-7 — `test_auth.py` mutates the `lru_cache`d Settings singleton** to toggle auth, with teardown restoring it. Pragmatic and works because tests share a process; just know test ordering is load-bearing (`test_auth` must restore before `test_e2e` asserts open access). Fine for this codebase.

---

## Simplification pass (48-hour lens)

1. **`api.ts`: `exportReport` duplicates `request()`'s 401/clearToken/error handling** (`api.ts:131-139`). Give `request` a `parse: 'json' | 'text'` flag (or a `requestText` twin that shares the fetch+401 core) and delete the duplicate. This also means the M-2 fix lives in exactly one place.
2. **`main.py` periodic-purge middleware is slightly over-engineered** for 48 hours: module-level `_last_purge` defined *after* the middleware that `global`s it (works, reads oddly), inline `import time as _t`, and a piggyback-on-traffic design. Simplest equivalent: an `asyncio` background task started in `lifespan` (`while True: purge; await sleep(600)`), or honestly just the startup purge alone for a 2-day demo. Not auth, but it was part of this change set.
3. **`expires_in` in `TokenOut` is dead weight** — the frontend stores only `access_token` and never schedules refresh. Harmless (standard OAuth shape), keep or drop; don't build refresh logic around it.
4. **`App.tsx:167` reads `api.getToken()` during render** for the Sign-out button — non-reactive escape hatch that happens to work because `unlocked` transitions force the re-renders. Fine as-is; simpler and honest alternative: show Sign out whenever `unlocked === true` and auth was probed as required.
5. **Not overbuilt, keep as-is:** boot-time re-hash of all editors (doubles as rotation, N users × bcrypt ≈ trivial), HTTPBearer `auto_error=False` for consistent 401s, the auth-disabled `"dev"` mode (tests and local dev lean on it) — provided H-1's boot guard lands.
6. **No dead code found** in the auth additions themselves. `UnauthorizedError`, `withAuth`, `clearToken` are all reachable and used.

---

## Pre-launch checklist (ordered, ~30 min total)

1. [ ] H-1 boot guard (3 lines) + verify `JWT_SECRET` (32+ random bytes) and `AUTH_USERS` set in the hosting platform's env.
2. [ ] Strong random passwords in `AUTH_USERS` (covers M-1 with zero code).
3. [ ] M-3 dummy-hash timing pad (3 lines).
4. [ ] M-2 `UnauthorizedError` → login screen in `App.tsx` (and fold in simplification #1 while touching `api.ts`).
5. [ ] Optional: N-2 `require: ["exp","sub"]`, N-5 hide docs when auth is on.
