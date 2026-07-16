from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.logging import request_id_ctx


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        field_errors: dict[str, list[str]] | None = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.field_errors = field_errors or {}


async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.code,
            "message": exc.message,
            "field_errors": exc.field_errors,
            "request_id": request_id_ctx.get(),
        },
    )
