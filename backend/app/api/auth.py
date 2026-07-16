from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.cookies import clear_auth_cookies, set_auth_cookies
from app.core.database import get_db
from app.core.errors import AppError
from app.models import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    RefreshResponse,
    UserMeResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    user, access_token, refresh_token = await auth_service.login(
        db,
        username=body.username,
        password=body.password,
        ip_address=_client_ip(request),
        device_info=request.headers.get("User-Agent"),
    )
    set_auth_cookies(response, access_token=access_token, refresh_token=refresh_token)
    return LoginResponse(
        user=UserMeResponse.model_validate(user),
        must_change_password=user.must_change_password,
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_session(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    body: RefreshRequest = RefreshRequest(),
):
    token = request.cookies.get("refresh_token") or body.refresh_token
    if not token:
        raise AppError("INVALID_REFRESH", auth_service.SESSION_EXPIRED, status_code=401)
    user, access_token, new_refresh = await auth_service.refresh_tokens(
        db,
        refresh_token=token,
        ip_address=_client_ip(request),
        device_info=request.headers.get("User-Agent"),
    )
    set_auth_cookies(response, access_token=access_token, refresh_token=new_refresh)
    return RefreshResponse(
        user=UserMeResponse.model_validate(user),
        access_token=access_token,
        refresh_token=new_refresh,
    )


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    body: RefreshRequest = RefreshRequest(),
):
    token = request.cookies.get("refresh_token") or body.refresh_token
    await auth_service.logout(db, refresh_token=token)
    clear_auth_cookies(response)
    return {"status": "ok"}


@router.get("/me", response_model=UserMeResponse)
async def me(current_user: User = Depends(get_current_user)):
    return UserMeResponse.model_validate(current_user)


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await auth_service.change_password(
        db,
        user=current_user,
        current_password=body.current_password,
        new_password=body.new_password,
    )
    return {"status": "ok"}
