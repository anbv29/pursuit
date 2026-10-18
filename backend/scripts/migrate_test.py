"""Apply migrations using the configured isolated test database, without printing credentials."""

from alembic import command
from alembic.config import Config
from app.core.config import get_settings

config = Config("alembic.ini")
config.set_main_option("sqlalchemy.url", get_settings().test_database_url.replace("%", "%%"))
command.upgrade(config, "head")
