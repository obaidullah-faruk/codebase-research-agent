from __future__ import annotations
import logging
import time

from django.conf import settings
from langgraph.graph import END

from .state import ResearchState

logger = logging.getLogger(__name__)

MAX_ITERATIONS = int(getattr(settings, "AGENT_MAX_ITERATIONS", 15))
SOFT_LIMIT = int(getattr(settings, "CELERY_TASK_SOFT_TIME_LIMIT", 120))
TIME_BUDGET = SOFT_LIMIT - 45   # stop new LLM calls at 75s to avoid hard kill at 120s


def should_continue(state: ResearchState) -> str:
    """Decide next node after call_model."""
    session_id = state["session_id"]

    if state["iterations"] >= MAX_ITERATIONS:
        logger.warning("[session=%s] max iterations (%d) reached", session_id, MAX_ITERATIONS)
        return END

    elapsed = time.monotonic() - state["time_start"]
    if elapsed >= TIME_BUDGET:
        logger.warning("[session=%s] time budget reached at %.1fs", session_id, elapsed)
        return END

    last = state["messages"][-1]
    if getattr(last, "tool_calls", None):
        return "execute_tools"

    return END
