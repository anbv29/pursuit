import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api import auth, workspaces
from app.core.config import get_settings
from app.core.db import get_engine
from app.core.errors import install_handlers

logger = logging.getLogger("pursuit")

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Cache-Control": "no-store",
}


def create_app() -> FastAPI:
    settings = get_settings()
    is_prod = settings.app_env == "production"
    app = FastAPI(
        title="Pursuit API",
        version="0.1.0",
        docs_url=None if is_prod else "/docs",
        redoc_url=None,
        openapi_url=None if is_prod else "/openapi.json",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "X-CSRF-Token"],
    )

    @app.middleware("http")
    async def _headers(request: Request, call_next):
        try:
            response = await call_next(request)
        except Exception:
            logger.exception("Unhandled error on %s %s", request.method, request.url.path)
            response = JSONResponse(
                status_code=500, content={"error": {"code": "internal", "message": "Something went wrong."}}
            )
        for k, v in SECURITY_HEADERS.items():
            response.headers.setdefault(k, v)
        if settings.cookie_secure:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response

    install_handlers(app)
    app.include_router(auth.router)
    app.include_router(workspaces.router)

    @app.get("/api/health", tags=["ops"])
    def health():
        try:
            with get_engine().connect() as conn:
                conn.execute(text("SELECT 1"))
            db_ok = True
        except Exception:
            logger.exception("Health check DB probe failed")
            db_ok = False
        body = {"status": "ok" if db_ok else "degraded", "database": db_ok, "fo_mode": settings.fo_mode}
        return JSONResponse(status_code=200 if db_ok else 503, content=body)

    return app


app = create_app()
