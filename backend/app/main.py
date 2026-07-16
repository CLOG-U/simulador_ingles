import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin_audit import router as admin_audit_router
from app.api.admin_users import router as admin_users_router
from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.core.config import settings
from app.core.errors import AppError, app_error_handler
from app.core.logging import RequestIdFilter, new_request_id, request_id_ctx, setup_logging

setup_logging(settings.log_level)
logging_filter = RequestIdFilter()
for handler in logging.getLogger().handlers:
    handler.addFilter(logging_filter)

app = FastAPI(
    title="Simulador de verbos - Powerful English Academy",
    version="0.1.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    rid = request.headers.get("X-Request-ID") or new_request_id()
    token = request_id_ctx.set(rid)
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        return response
    finally:
        request_id_ctx.reset(token)


app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(admin_users_router, prefix="/api/v1")
app.include_router(admin_audit_router, prefix="/api/v1")
