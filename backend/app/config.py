"""Application settings loaded from environment / .env."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str = ""
    elevenlabs_api_key: str = ""
    zep_api_key: str = ""
    mirofish_base_url: str = "http://localhost:5001"
    database_url: str = "sqlite:///./storycritic.db"
    content_ttl_minutes: int = 120  # NFR-7: session-scoped raw content
    demo_mock: bool = False  # keyless E2E rehearsal: deterministic story-rep + canned verdict
    # Model per stage, so a model can be A/B'd without a code change.
    model_beats: str = "gpt-4o-mini"
    model_triage: str = "gpt-4o-mini"
    model_transform: str = "gpt-4o"
    model_interrogate: str = "gpt-4o-mini"
    # Editor JWT auth (public hosting). Empty jwt_secret (default) = auth DISABLED —
    # local dev and tests run fully open; set a strong secret in production.
    jwt_secret: str = ""
    jwt_expiry_hours: int = 12
    # Editor accounts seeded at startup: "user1:plainpass1,user2:pass2".
    # Passwords are bcrypt-hashed on boot — plaintext never touches the DB.
    auth_users: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
