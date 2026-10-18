from enum import StrEnum


class UseCase(StrEnum):
    SEGMENT_VALIDATION = "segment_validation"
    WILLINGNESS_TO_PAY = "willingness_to_pay"
    MESSAGING = "messaging"
    PROBLEM_DISCOVERY = "problem_discovery"
    COMPETITIVE_RESEARCH = "competitive_research"
    FUNNEL_DIAGNOSIS = "funnel_diagnosis"


class Stage(StrEnum):
    """Shared experiment lifecycle, in order."""

    HYPOTHESIS = "hypothesis"
    RESEARCH = "research"
    EVIDENCE = "evidence"
    DESIGN = "design"
    APPROVAL = "approval"
    ACTION = "action"
    OUTCOMES = "outcomes"
    ANALYSIS = "analysis"
    RECOMMENDATION = "recommendation"


STAGE_ORDER: list[Stage] = list(Stage)


class Decision(StrEnum):
    CONTINUE = "CONTINUE"
    ITERATE = "ITERATE"
    PIVOT = "PIVOT"
    STOP = "STOP"
    INCONCLUSIVE = "INCONCLUSIVE"


class EvidenceKind(StrEnum):
    OBSERVED_FACT = "observed_fact"
    INTERPRETATION = "interpretation"
    ASSUMPTION = "assumption"


class Stance(StrEnum):
    SUPPORTS = "supports"
    CONTRADICTS = "contradicts"
    NEUTRAL = "neutral"


class ActionStatus(StrEnum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"
    UNKNOWN = "UNKNOWN"


class ActionKind(StrEnum):
    SEND_EMAIL = "send_email"
    SCHEDULE_MEETING = "schedule_meeting"
    RESEARCH_TASK = "research_task"


class OutcomeKind(StrEnum):
    SENT = "sent"
    DELIVERED = "delivered"
    REPLIED = "replied"
    POSITIVE_REPLY = "positive_reply"
    MEETING_BOOKED = "meeting_booked"
    INTERVIEW_COMPLETED = "interview_completed"
    PRICING_FEEDBACK = "pricing_feedback"
    VERBAL_INTEREST = "verbal_interest"
    COMMITMENT = "commitment"  # LOI, deposit, paid pilot
    CUSTOM = "custom"


class DataOrigin(StrEnum):
    """Where a record came from. DEMO data must never count as live results."""

    MANUAL = "manual"
    IMPORT = "import"
    FO = "fo"
    AI = "ai"
    DEMO = "demo"


class Role(StrEnum):
    OWNER = "owner"
    MEMBER = "member"
