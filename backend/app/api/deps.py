from fastapi import Cookie, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import AppError
from app.models import User, UserRole
from app.services.auth_service import user_from_access_token


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
    access_token: str | None = Cookie(default=None),
) -> User:
    token = access_token or request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    if not token:
        raise AppError("UNAUTHORIZED", "No autorizado", status_code=401)

    user_id, _role = user_from_access_token(token)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise AppError("UNAUTHORIZED", "No autorizado", status_code=401)
    return user


def require_role(*roles: UserRole):
    async def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise AppError("FORBIDDEN", "No tienes permiso para esta acción", status_code=403)
        return current_user

    return dependency


require_admin = require_role(UserRole.ADMIN)
require_student = require_role(UserRole.STUDENT)
