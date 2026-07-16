from fastapi import Response

from app.core.config import settings


def set_auth_cookies(response: Response, *, access_token: str, refresh_token: str) -> None:
    access_max_age = settings.access_token_expire_minutes * 60
    refresh_max_age = settings.refresh_token_expire_days * 24 * 60 * 60
    common = {
        "httponly": True,
        "secure": settings.cookie_secure,
        "samesite": settings.cookie_samesite,
        "path": "/",
    }
    response.set_cookie(key="access_token", value=access_token, max_age=access_max_age, **common)
    response.set_cookie(key="refresh_token", value=refresh_token, max_age=refresh_max_age, **common)


def clear_auth_cookies(response: Response) -> None:
    common = {
        "httponly": True,
        "secure": settings.cookie_secure,
        "samesite": settings.cookie_samesite,
        "path": "/",
    }
    response.delete_cookie(key="access_token", **common)
    response.delete_cookie(key="refresh_token", **common)
