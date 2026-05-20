import logging
from urllib.parse import urlparse

from research_sessions.models import Repository, ResearchSession
from agent.tasks import run_research_task

logger = logging.getLogger(__name__)


def _repo_name_from_url(url: str) -> str:
    path = urlparse(url).path.strip("/")
    return path if path else url


def create_session(repo_url: str, question: str) -> ResearchSession:
    repo, created = Repository.objects.get_or_create(
        url=repo_url,
        defaults={"name": _repo_name_from_url(repo_url)},
    )
    if created:
        logger.info("New repository registered: %s", repo_url)

    session = ResearchSession.objects.create(repository=repo, question=question)
    run_research_task.delay(str(session.id))
    logger.info("Queued session %s for repo %s (question length=%d)", session.id, repo_url, len(question))
    return session
