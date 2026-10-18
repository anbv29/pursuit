"""Initialize only the explicitly selected new preview DB; keep owner credentials local."""

import secrets
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import psycopg
from alembic import command
from alembic.config import Config
from cryptography.fernet import Fernet
from dotenv import dotenv_values
from psycopg import sql

path = Path(".env.preview")
values = dotenv_values(path)
owner = values["PREVIEW_DATABASE_OWNER_URL"]
parts = urlsplit(owner)
if not parts.hostname or not parts.hostname.endswith(".neon.tech"):
    raise SystemExit("Preview provisioning requires the saved Neon connection.")
role = "pursuit_preview_app"
password = values.get("PREVIEW_RUNTIME_PASSWORD") or secrets.token_urlsafe(32)
try:
    config = Config("alembic.ini")
    migration_url = owner.replace("postgresql://", "postgresql+psycopg://", 1)
    config.set_main_option("sqlalchemy.url", migration_url.replace("%", "%%"))
    command.upgrade(config, "head")
    with psycopg.connect(owner, autocommit=True) as connection:
        exists = connection.execute("SELECT 1 FROM pg_roles WHERE rolname=%s", (role,)).fetchone()
        if not exists:
            connection.execute(
                sql.SQL("CREATE ROLE {} LOGIN PASSWORD {}").format(
                    sql.Identifier(role),
                    sql.Literal(password),
                )
            )
        elif not values.get("PREVIEW_RUNTIME_PASSWORD"):
            raise RuntimeError("Existing role requires its saved password; no credential is overwritten.")
        connection.execute(
            sql.SQL("GRANT CONNECT ON DATABASE {} TO {}").format(
                sql.Identifier(parts.path.lstrip("/")),
                sql.Identifier(role),
            )
        )
        connection.execute(sql.SQL("GRANT USAGE ON SCHEMA public TO {}").format(sql.Identifier(role)))
        connection.execute(
            sql.SQL("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {}").format(
                sql.Identifier(role)
            )
        )
        connection.execute(
            sql.SQL("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {}").format(
                sql.Identifier(role)
            )
        )
        connection.execute(
            sql.SQL(
                "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
                "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {}"
            ).format(sql.Identifier(role))
        )
        connection.execute(
            sql.SQL(
                "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO {}"
            ).format(sql.Identifier(role))
        )
    runtime = urlunsplit(
        (
            parts.scheme,
            f"{role}:{password}@{parts.hostname}:{parts.port or 5432}",
            parts.path,
            parts.query,
            "",
        )
    )
    values.update(DATABASE_URL=runtime, PREVIEW_RUNTIME_PASSWORD=password)
    values.setdefault("CONNECTION_ENCRYPTION_KEY", Fernet.generate_key().decode())
    path.write_text("".join(f"{key}={value}\n" for key, value in values.items()), encoding="utf-8")
    with psycopg.connect(runtime) as connection:
        connection.execute("SELECT id FROM experiments LIMIT 1").fetchone()
    print("Preview schema migrated; limited runtime role connected successfully. Secrets saved privately.")
except Exception as exc:
    print(f"Preview provisioning failed ({type(exc).__name__}); details suppressed to protect credentials.")
    raise SystemExit(1) from None
