from app.adapters.fo.base import FoAdapter
from app.adapters.fo.demo import DemoFoAdapter
from app.core.config import get_settings

_demo = DemoFoAdapter()


def get_adapter(mode: str | None = None) -> FoAdapter:
    """Demo workspaces always get the demo adapter, regardless of server mode."""
    mode = mode or get_settings().fo_mode
    if mode == "live":
        from app.adapters.fo.mcp import McpFoAdapter

        return McpFoAdapter()
    return _demo
