"""PKCE OAuth and serialized, encrypted per-user token refresh for Fo."""

import base64
import hashlib
import json
import secrets
from datetime import timedelta
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import select

from app.core.config import get_settings
from app.core.db import new_session, utcnow
from app.core.errors import AppError
from app.models.connection import FoAuthorization, FoConnection


def cipher() -> Fernet:
    key = get_settings().connection_encryption_key
    if not key:
        raise AppError(
            "Fo sign-in needs CONNECTION_ENCRYPTION_KEY configured on the server.", "not_configured"
        )
    try:
        return Fernet(key.get_secret_value().encode())
    except (ValueError, TypeError) as exc:
        raise AppError("The server's connection encryption key is invalid.", "not_configured") from exc


def seal(data: dict) -> str:
    return cipher().encrypt(json.dumps(data).encode()).decode()


def unseal(value: str) -> dict:
    try:
        return json.loads(cipher().decrypt(value.encode()))
    except (InvalidToken, ValueError) as exc:
        raise AppError("Fo credentials cannot be read. Reconnect your account.", "reconnect") from exc


def request(path: str, *, form=None, data=None) -> dict:
    issuer = get_settings().fo_oauth_issuer.rstrip("/")
    try:
        response = httpx.post(issuer + path, data=form, json=data, timeout=20)
        response.raise_for_status()
        result = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise AppError("Fo sign-in failed or expired. Please reconnect.", "reconnect") from exc
    if not isinstance(result, dict) or result.get("error"):
        raise AppError("Fo declined the connection. Please reconnect.", "reconnect")
    return result


def start(db, user_id, workspace_id) -> str:
    cipher()  # refuse before any external registration if encryption is unavailable
    callback = get_settings().public_app_url.rstrip("/") + "/api/fo/oauth/callback"
    registration = request(
        "/oauth/register",
        data={
            "client_name": "Pursuit",
            "redirect_uris": [callback],
            "grant_types": ["authorization_code", "refresh_token"],
            "response_types": ["code"],
            "token_endpoint_auth_method": "none",
        },
    )
    client_id = registration.get("client_id")
    if not isinstance(client_id, str):
        raise AppError("Fo did not return a client identifier.", "reconnect")
    state, verifier = secrets.token_urlsafe(32), secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    db.add(
        FoAuthorization(
            user_id=user_id,
            workspace_id=workspace_id,
            client_id=client_id,
            state_hash=hashlib.sha256(state.encode()).hexdigest(),
            verifier_blob=seal({"verifier": verifier, "callback": callback}),
            expires_at=utcnow() + timedelta(minutes=10),
        )
    )
    db.commit()
    return (
        get_settings().fo_oauth_issuer.rstrip("/")
        + "/oauth/authorize?"
        + urlencode(
            {
                "response_type": "code",
                "client_id": client_id,
                "redirect_uri": callback,
                "scope": "mcp",
                "state": state,
                "code_challenge": challenge,
                "code_challenge_method": "S256",
            }
        )
    )


def complete(db, user_id, code: str, state: str):
    pending = db.scalar(
        select(FoAuthorization)
        .where(
            FoAuthorization.state_hash == hashlib.sha256(state.encode()).hexdigest(),
            FoAuthorization.user_id == user_id,
            FoAuthorization.expires_at > utcnow(),
        )
        .with_for_update()
    )
    if pending is None:
        raise AppError("This sign-in link expired or belongs to another account. Start again.", "reconnect")
    saved = unseal(pending.verifier_blob)
    tokens = request(
        "/oauth/token",
        form={
            "grant_type": "authorization_code",
            "code": code,
            "client_id": pending.client_id,
            "code_verifier": saved["verifier"],
            "redirect_uri": saved["callback"],
        },
    )
    _validate_tokens(tokens)
    connection = db.get(FoConnection, user_id)
    if connection is None:
        connection = FoConnection(user_id=user_id)
        db.add(connection)
    connection.client_id, connection.token_blob = pending.client_id, seal(tokens)
    connection.expires_at = utcnow() + timedelta(seconds=int(tokens.get("expires_in", 3600)))
    workspace_id = pending.workspace_id
    db.delete(pending)
    db.commit()
    return workspace_id


def _validate_tokens(tokens):
    if not isinstance(tokens.get("access_token"), str) or not tokens["access_token"]:
        raise AppError("Fo returned no usable token. Please reconnect.", "reconnect")


def access_token(user_id, force=False) -> str:
    with new_session() as db:
        connection = db.scalar(select(FoConnection).where(FoConnection.user_id == user_id).with_for_update())
        if connection is None:
            raise AppError("Connect your own Fo account in Settings first.", "reconnect")
        tokens = unseal(connection.token_blob)
        if force or connection.expires_at <= utcnow() + timedelta(seconds=60):
            refresh = tokens.get("refresh_token")
            if not refresh:
                raise AppError("Fo needs you to sign in again.", "reconnect")
            replacement = request(
                "/oauth/token",
                form={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh,
                    "client_id": connection.client_id,
                },
            )
            _validate_tokens(replacement)
            replacement.setdefault("refresh_token", refresh)
            tokens = replacement
            connection.token_blob = seal(tokens)
            connection.expires_at = utcnow() + timedelta(seconds=int(tokens.get("expires_in", 3600)))
            db.commit()
        return tokens["access_token"]
