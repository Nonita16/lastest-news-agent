import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # API Keys
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    exa_api_key: str = os.getenv("EXA_API_KEY", "")

    # Environment
    environment: str = os.getenv("ENVIRONMENT", "development")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    # CORS
    cors_origins: list[str] = ["http://localhost:3000",
                               "http://localhost:3001"]


    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
