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


@lru_cache
def get_settings() -> Settings:
    return Settings()
