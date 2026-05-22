import os

from .github_tools import build_github_tools
from .local_tools import build_local_tools
from .db_tools import build_db_tools


def build_tools(repo_url: str, session_id: str) -> list:
    """Return the full bound tool list for a session."""
    if os.path.isabs(repo_url):
        source_tools = build_local_tools(repo_url)
    else:
        source_tools = build_github_tools(repo_url)
    return source_tools + build_db_tools(session_id)
