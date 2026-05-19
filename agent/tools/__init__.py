from .github_tools import build_github_tools
from .db_tools import build_db_tools


def build_tools(repo_url: str, session_id: str) -> list:
    """Return the full bound tool list for a session."""
    return build_github_tools(repo_url) + build_db_tools(session_id)
