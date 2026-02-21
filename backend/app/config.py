"""
Laya Healthcare AI Claims Chatbot — Configuration
Loads environment variables and defines application settings.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    # OpenAI / Azure OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL_PRINCIPAL: str = os.getenv("OPENAI_MODEL_PRINCIPAL", "gpt-4o")
    OPENAI_MODEL_CHILD: str = os.getenv("OPENAI_MODEL_CHILD", "gpt-4o-mini")

    # Azure-specific (set AZURE_OPENAI_ENDPOINT to enable Azure mode)
    AZURE_OPENAI_ENDPOINT: str = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    AZURE_OPENAI_API_VERSION: str = os.getenv("AZURE_OPENAI_API_VERSION", "2024-10-21")
    AZURE_DEPLOYMENT_PRINCIPAL: str = os.getenv("AZURE_DEPLOYMENT_PRINCIPAL", "gpt-4o")
    AZURE_DEPLOYMENT_CHILD: str = os.getenv("AZURE_DEPLOYMENT_CHILD", "gpt-4o")

    @property
    def use_azure(self) -> bool:
        return bool(self.AZURE_OPENAI_ENDPOINT)

    # FastAPI
    APP_HOST: str = os.getenv("APP_HOST", "0.0.0.0")
    APP_PORT: int = int(os.getenv("APP_PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    # Data paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    JSON_DATA_PATH: str = os.path.join(BASE_DIR, "data", "json_users.json")

    # OCR Mode
    USE_REAL_OCR: bool = os.getenv("USE_REAL_OCR", "false").lower() == "true"

    # API Timeout
    LLM_TIMEOUT: int = int(os.getenv("LLM_TIMEOUT", "30"))


settings = Settings()
