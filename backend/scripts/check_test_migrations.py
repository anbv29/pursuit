"""Round-trip only the isolated local test database, never a hosted database."""

from alembic import command
from alembic.config import Config
from sqlalchemy.engine import make_url

from app.core.config import get_settings

url = get_settings().test_database_url
parsed = make_url(url)
if parsed.host not in ("localhost", "127.0.0.1") or parsed.database != "pursuit_test":
    raise SystemExit("Migration recovery check is restricted to local pursuit_test.")
config = Config("alembic.ini")
config.set_main_option("sqlalchemy.url", url.replace("%", "%%"))
command.upgrade(config, "head")
command.downgrade(config, "base")
command.upgrade(config, "head")
print("Local test migration upgrade/downgrade/upgrade passed.")
