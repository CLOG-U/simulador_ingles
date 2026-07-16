"""Crea el administrador inicial de forma interactiva o por variable de entorno."""

import asyncio
import getpass
import os
import sys
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password, normalize_username
from app.models import User, UserRole


async def create_admin(
    session: AsyncSession,
    *,
    username: str,
    full_name: str,
    password: str,
) -> User:
    normalized = normalize_username(username)
    existing = await session.execute(select(User).where(User.username_normalized == normalized))
    if existing.scalar_one_or_none():
        raise ValueError(f"El usuario '{username}' ya existe.")

    user = User(
        id=uuid.uuid4(),
        username=username.strip(),
        username_normalized=normalized,
        full_name=full_name.strip(),
        password_hash=hash_password(password),
        role=UserRole.ADMIN,
        is_active=True,
        must_change_password=False,
    )
    session.add(user)
    await session.commit()
    return user


async def run() -> None:
    username = os.environ.get("ADMIN_USERNAME") or input("Usuario administrador: ").strip()
    full_name = os.environ.get("ADMIN_FULL_NAME") or input("Nombre completo: ").strip()
    password = os.environ.get("ADMIN_PASSWORD")
    bootstrap = bool(os.environ.get("ADMIN_USERNAME") and os.environ.get("ADMIN_PASSWORD"))
    if not password:
        password = getpass.getpass("Contraseña: ")
        confirm = getpass.getpass("Confirmar contraseña: ")
        if password != confirm:
            print("Las contraseñas no coinciden.", file=sys.stderr)
            sys.exit(1)

    if len(password) < 8:
        print("La contraseña debe tener al menos 8 caracteres.", file=sys.stderr)
        sys.exit(1)

    connect_args: dict = {}
    if settings.database_ssl_required:
        import ssl

        if os.environ.get("ADMIN_ALLOW_INSECURE_SSL") == "1":
            connect_args["ssl"] = ssl._create_unverified_context()
        else:
            connect_args["ssl"] = ssl.create_default_context()

    engine = create_async_engine(
        settings.database_url_async,
        echo=False,
        connect_args=connect_args,
    )
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        async with factory() as session:
            user = await create_admin(
                session, username=username, full_name=full_name, password=password
            )
        print(f"Administrador '{user.username}' creado correctamente.")
    except ValueError as exc:
        if bootstrap:
            print(str(exc), "- se omite (bootstrap).")
        else:
            print(str(exc), file=sys.stderr)
            sys.exit(1)
    finally:
        await engine.dispose()


def main() -> None:
    asyncio.run(run())


if __name__ == "__main__":
    main()
