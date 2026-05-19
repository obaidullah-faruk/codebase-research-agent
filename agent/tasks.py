import logging
import time

from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded
from django.utils import timezone
from langchain_core.messages import HumanMessage

from agent.graph.builder import compile_graph
from research_sessions.models import ResearchSession, SessionLog

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=0,
    soft_time_limit=120,
    time_limit=150,
    name="agent.tasks.run_research_task",
)
def run_research_task(self, session_id: str) -> None:

    session = ResearchSession.objects.select_related("repository").get(pk=session_id)
    repo_url = session.repository.url

    session.status = ResearchSession.Status.RUNNING
    session.save(update_fields=["status"])
    logger.info("[session=%s] started repo=%s", session_id, repo_url)

    SessionLog.objects.create(
        session=session,
        kind=SessionLog.Kind.START,
        step=0,
        data={"repo_url": repo_url, "question": session.question[:200]},
    )

    try:
        graph = compile_graph(repo_url=repo_url, session_id=session_id)

        final_state = graph.invoke({
            "messages": [HumanMessage(content=session.question)],
            "session_id": session_id,
            "repo_url": repo_url,
            "iterations": 0,
            "tokens_used": 0,
            "time_start": time.monotonic(),
        })

        answer = ""
        for msg in reversed(final_state["messages"]):
            content = getattr(msg, "content", "")
            if isinstance(content, str) and not getattr(msg, "tool_calls", None):
                answer = content.strip()
                break

        session.answer = answer or "No answer was produced."
        session.tokens_used = final_state.get("tokens_used", 0)
        session.iterations = final_state.get("iterations", 0)
        session.status = ResearchSession.Status.COMPLETED
        session.completed_at = timezone.now()
        session.save(update_fields=["answer", "tokens_used", "iterations", "status", "completed_at"])

        SessionLog.objects.create(
            session=session,
            kind=SessionLog.Kind.ANSWER,
            step=session.iterations,
            data={"tokens_used": session.tokens_used, "iterations": session.iterations},
        )
        logger.info(
            "[session=%s] completed in %d iterations, %d tokens",
            session_id, session.iterations, session.tokens_used,
        )

    except SoftTimeLimitExceeded:
        _mark_failed(session, "Task timed out after 120 seconds.")
        logger.warning("[session=%s] soft time limit exceeded", session_id)

    except Exception as exc:
        _mark_failed(session, str(exc))
        SessionLog.objects.create(
            session=session,
            kind=SessionLog.Kind.ERROR,
            step=0,
            data={"error": str(exc)},
        )
        logger.exception("[session=%s] failed: %s", session_id, exc)
        raise

    finally:
        session.repository.last_analyzed_at = timezone.now()
        session.repository.save(update_fields=["last_analyzed_at"])


def _mark_failed(session, reason: str) -> None:
    session.status = session.__class__.Status.FAILED
    session.error_message = reason
    session.completed_at = timezone.now()
    session.save(update_fields=["status", "error_message", "completed_at"])
