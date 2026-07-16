"""Sirve el build del frontend (Vite) y hace fallback SPA a index.html."""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

STATIC_DIR = Path(__file__).resolve().parent / "static"


def mount_spa(app: FastAPI) -> None:
    if not STATIC_DIR.is_dir():
        return

    assets_dir = STATIC_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def spa_index() -> FileResponse:
        return FileResponse(STATIC_DIR / "index.html")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str) -> FileResponse:
        # Las rutas /api/* ya están registradas antes; esto solo cubre el resto.
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("redoc"):
            raise HTTPException(status_code=404, detail="Not Found")

        candidate = STATIC_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)

        return FileResponse(STATIC_DIR / "index.html")
