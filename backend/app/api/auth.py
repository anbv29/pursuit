from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.api.deps import current_session
from app.core.config import get_settings
from app.core.db import get_db
from app.core.ratelimit import limiter
from app.core.security import SESSION_COOKIE
from app.models import AuthSession
from app.schemas.common import LoginIn, RegisterIn, SessionOut, UserOut
from app.services import auth

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _client_ip(request: Request) -> str:
    """Client IP for rate limiting.

    With TRUSTED_PROXY_HOPS=N, take the address N entries from the right of
    X-Forwarded-For (the part our own proxies appended), so a client can't spoof
    it by sending its own header. With 0, use the socket peer.
    """
    hops = get_settings().trusted_proxy_hops
    if hops > 0:
        chain = [p.strip() for p in request.headers.get("x-forwarded-for", "").split(",") if p.strip()]
        if len(chain) >= hops:
            return chain[-hops]
    return request.client.host if request.client else "unknown"


def _set_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=settings.session_ttl_hours * 3600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


@router.post("/register", response_model=SessionOut, status_code=201)
def register(body: RegisterIn, request: Request, response: Response, db: Session = Depends(get_db)):
    limiter.check(
        f"register:{_client_ip(request)}", limit=get_settings().register_limit_per_hour, window_seconds=3600
    )
    auth.register(db, body.email, body.name, body.password)
    issued = auth.login(db, body.email, body.password)
    _set_cookie(response, issued.token)
    return SessionOut(user=UserOut.model_validate(issued.session.user), csrf_token=issued.csrf_token)


@router.post("/login", response_model=SessionOut)
def login(body: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    limiter.check(
        f"login:{_client_ip(request)}", limit=get_settings().login_limit_per_10min, window_seconds=600
    )
    limiter.check(f"login-email:{body.email.lower()}", limit=8, window_seconds=600)
    issued = auth.login(db, body.email, body.password)
    _set_cookie(response, issued.token)
    return SessionOut(user=UserOut.model_validate(issued.session.user), csrf_token=issued.csrf_token)


@router.get("/me", response_model=SessionOut)
def me(session: AuthSession = Depends(current_session)):
    return SessionOut(user=UserOut.model_validate(session.user), csrf_token=session.csrf_token)


@router.post("/logout", status_code=204)
def logout(
    response: Response, session: AuthSession = Depends(current_session), db: Session = Depends(get_db)
):
    auth.logout(db, session)
    response.delete_cookie(SESSION_COOKIE, path="/")
