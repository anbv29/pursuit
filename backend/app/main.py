import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, text

from app.api import (
    account,
    actions,
    analysis,
    auth,
    billing,
    concierge,
    discovery,
    evidence,
    experiments,
    first_look,
    fo_chat,
    fo_oauth,
    overview,
    payment_webhook,
    report_sharing,
    report_tools,
    reports,
    usage,
    workspaces,
)
from app.core.config import get_settings
from app.core.db import get_engine
from app.core.errors import install_handlers
from app.core.log_redaction import AccessRedaction, safe_path
from app.models import FirstLook, FoChatTurn

logger = logging.getLogger("pursuit")

logging.getLogger("uvicorn.access").addFilter(AccessRedaction())

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Cache-Control": "no-store",
}


@asynccontextmanager
async def lifespan(_: FastAPI):
    """A bounded worker claims durable jobs; expired leases resume after a restart."""
    from app.services.report_worker import start

    settings = get_settings()
    stop = start() if settings.report_worker_enabled and settings.app_env != "test" else None
    try:
        yield
    finally:
        if stop:
            stop.set()


def create_app() -> FastAPI:
    settings = get_settings()
    is_prod = settings.app_env == "production"
    app = FastAPI(
        title="Pursuit API",
        lifespan=lifespan,
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
            logger.exception("Unhandled error on %s %s", request.method, safe_path(request.url.path))
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
    app.include_router(account.router)
    app.include_router(billing.router)
    app.include_router(payment_webhook.router)
    app.include_router(concierge.router)
    app.include_router(workspaces.router)
    app.include_router(experiments.router)
    app.include_router(experiments.templates_router)
    app.include_router(evidence.router)
    app.include_router(actions.router)
    app.include_router(discovery.router)
    app.include_router(analysis.router)
    app.include_router(overview.router)
    app.include_router(reports.router)
    app.include_router(fo_oauth.router)
    app.include_router(fo_chat.router)
    app.include_router(first_look.router)
    app.include_router(report_tools.router)
    app.include_router(report_sharing.router)
    app.include_router(usage.router)

    @app.get("/api/health", tags=["ops"])
    def health():
        db_ok, schema_ok = False, False
        try:
            with get_engine().connect() as conn:
                conn.execute(text("SELECT 1"))
                db_ok = True
                # Verify deployed columns and runtime access without reading any customer data.
                conn.execute(select(FoChatTurn).limit(0))
                conn.execute(select(FirstLook).limit(0))
                schema_ok = True
        except Exception:
            logger.warning("Readiness probe failed; database schema or runtime access requires review")
        ready = db_ok and schema_ok
        body = {
            "status": "ok" if ready else "degraded",
            "database": db_ok,
            "schema": schema_ok,
            "fo_mode": settings.fo_mode,
        }
        return JSONResponse(status_code=200 if ready else 503, content=body)

    return app


app = create_app()
