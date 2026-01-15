from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_port: int = 8080
    data_dir: Path = Path("/data")
    db_path: Path = Path("/data/app.db")
    upload_dir: Path = Path("/data/uploads")

    class Config:
        env_prefix = ""
        case_sensitive = False


settings = Settings()
