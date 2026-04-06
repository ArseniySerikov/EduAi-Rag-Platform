from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/student_ai_db"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    OPENAI_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_TEMPERATURE: float = 0.35
    EMBEDDING_MODEL: str = "text-embedding-ada-002"
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 20
    FRONTEND_URL: str = "http://localhost:5173"
        # CORS (empty = only FRONTEND_URL). Needed for Docker + dev ports.
    CORS_ORIGINS: str = "" 
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
