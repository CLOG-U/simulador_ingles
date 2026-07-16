from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        url = "postgresql://" + url.removeprefix("postgres://")
    if url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url.removeprefix("postgresql://")
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://simulador:change_me_in_production@localhost:5432/simulador_ingles"
    secret_key: str = "change_me_to_a_long_random_string"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    cors_origins: str = "http://localhost:5173"
    environment: str = "development"
    log_level: str = "INFO"
    max_login_attempts: int = 5
    lockout_minutes: int = 15

    @property
    def database_url_async(self) -> str:
        return normalize_database_url(self.database_url)

    @property
    def database_ssl_required(self) -> bool:
        return self.environment == "production" or "supabase.co" in self.database_url

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def cookie_secure(self) -> bool:
        return self.environment == "production"

    @property
    def cookie_samesite(self) -> str:
        # Cross-site frontend/API on distinct *.onrender.com hosts need None+Secure.
        return "none" if self.environment == "production" else "lax"


settings = Settings()


def database_connect_args() -> dict:
    if not settings.database_ssl_required:
        return {}
    import ssl

    # El pooler de Supabase usa certificados que fallan verificación en Render.
    if "supabase.co" in settings.database_url:
        return {"ssl": ssl._create_unverified_context()}
    return {"ssl": True}
