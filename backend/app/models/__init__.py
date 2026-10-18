"""Import all models so Alembic autogenerate sees the full metadata."""

from app.models.activity import (  # noqa: F401
    ActionRequest,
    FunnelSnapshot,
    Interview,
    MessageVariant,
    OutcomeEvent,
    Prospect,
)
from app.models.experiment import (  # noqa: F401
    Evidence,
    Experiment,
    Recommendation,
    Source,
    SuccessCriterion,
)
from app.models.identity import (  # noqa: F401
    AuditEvent,
    AuthSession,
    IntegrationConfig,
    Membership,
    User,
    Workspace,
)
