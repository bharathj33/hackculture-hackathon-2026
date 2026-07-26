"""SQLAlchemy engine/session setup — SQLite locally, Postgres when deployed."""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

_url = get_settings().database_url
# check_same_thread is a SQLite-only DSN option; Postgres rejects it outright.
_connect_args = {"check_same_thread": False} if _url.startswith("sqlite") else {}

engine = create_engine(_url, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app import models  # noqa: F401  (register tables)

    Base.metadata.create_all(bind=engine)
    _add_missing_columns()


# Columns added after the banked demo DB was created. create_all() only ever
# CREATEs tables, so a pre-existing DB would otherwise boot missing them and
# fail every SELECT on that table.
_ADDED_COLUMNS = {
    "submissions": {"media_path": "VARCHAR(300)", "media_ext": "VARCHAR(8)", "media_bytes": "INTEGER"},
    "runs": {"stage": "VARCHAR(40)"},
}


def _add_missing_columns() -> None:
    from sqlalchemy import text

    if engine.dialect.name != "sqlite":
        # Postgres path: ADD COLUMN IF NOT EXISTS is idempotent, no PRAGMA needed.
        # (This used to early-return, so prod silently skipped every migration.)
        with engine.begin() as conn:
            for table, cols in _ADDED_COLUMNS.items():
                for name, ddl in cols.items():
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {name} {ddl}"))
        return

    with engine.begin() as conn:
        for table, columns in _ADDED_COLUMNS.items():
            present = {row[1] for row in conn.execute(text(f"PRAGMA table_info({table})"))}
            for name, ddl in columns.items():
                if name not in present:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
