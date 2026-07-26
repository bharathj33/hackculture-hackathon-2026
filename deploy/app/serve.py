"""Deploy entrypoint (Railway + Databricks Apps) — wraps the FastAPI app.

- On Postgres, hands off to the app untouched.
- On SQLite (no DATABASE_URL set), copies the seeded demo DB to a writable path
  first, so a cold container still serves the banked verdict.
- Mounts the built frontend at / and binds to the platform's port.
"""
import os
import pathlib
import shutil

HERE = pathlib.Path(__file__).parent

if not os.environ.get("DATABASE_URL"):  # SQLite fallback: seed a writable copy
    db_path = "/tmp/storycritic.db"
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
    seed = HERE / "seed" / "storycritic.db"
    if seed.exists() and not pathlib.Path(db_path).exists():
        shutil.copy(seed, db_path)

from fastapi.staticfiles import StaticFiles  # noqa: E402

from app.main import app  # noqa: E402

static = HERE / "static"
if static.exists():
    app.mount("/", StaticFiles(directory=static, html=True), name="static")

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT") or os.environ.get("DATABRICKS_APP_PORT") or "8000")
    uvicorn.run(app, host="0.0.0.0", port=port)
