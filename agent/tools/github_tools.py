import logging
import os
from functools import partial

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

from agent.github_client import GitHubClient

logger = logging.getLogger(__name__)


def _client(repo_url: str) -> GitHubClient:
    return GitHubClient.from_url(repo_url)


def _list_files(repo_url: str, path: str = "") -> str:
    try:
        items = _client(repo_url).list_contents(path)
    except Exception as exc:
        return f"Error listing {path!r}: {exc}"
    if not isinstance(items, list):
        return f"Path {path!r} is a file, not a directory."
    lines = [("[dir]" if i["type"] == "dir" else "[file]") + f" {i['path']}" for i in items]
    logger.debug("list_files repo=%s path=%r → %d items", repo_url, path, len(lines))
    return "\n".join(lines) or "(empty directory)"


def _read_file(repo_url: str, path: str) -> str:
    max_chars = int(os.environ.get("AGENT_MAX_FILE_CHARS", 8000))
    try:
        content = _client(repo_url).get_file_content(path)
    except Exception as exc:
        return f"Error reading {path!r}: {exc}"
    if len(content) > max_chars:
        content = content[:max_chars] + f"\n\n[truncated at {max_chars} chars]"
    logger.debug("read_file repo=%s path=%r → %d chars", repo_url, path, len(content))
    return content


def _search_code(repo_url: str, query: str) -> str:
    try:
        items = _client(repo_url).search_code(query)
    except Exception as exc:
        if "401" in str(exc) or "Unauthorized" in str(exc):
            return "search_code unavailable: GitHub token not configured. Use list_files instead."
        return f"Error searching for {query!r}: {exc}"
    if not items:
        return f"No results for {query!r}."
    lines = [f"{item['path']} (score {item.get('score', '?')})" for item in items]
    logger.debug("search_code query=%r → %d results", query, len(lines))
    return "\n".join(lines)


def _get_file_summary(repo_url: str, path: str) -> str:
    preview_chars = 800
    try:
        content = _client(repo_url).get_file_content(path)
    except Exception as exc:
        return f"Error reading {path!r}: {exc}"
    if len(content) > preview_chars:
        return content[:preview_chars] + "\n\n[summary truncated — use read_file for full content]"
    return content


class ListFilesInput(BaseModel):
    path: str = Field(default="", description="Directory path to list (empty string for root).")

class ReadFileInput(BaseModel):
    path: str = Field(description="File path relative to repo root.")

class SearchCodeInput(BaseModel):
    query: str = Field(description="Search query string (symbol name, function, keyword).")

class GetFileSummaryInput(BaseModel):
    path: str = Field(description="File path relative to repo root.")


def build_github_tools(repo_url: str) -> list:
    return [
        StructuredTool.from_function(
            func=partial(_list_files, repo_url),
            name="list_files",
            description="List files and directories at a path in the repository.",
            args_schema=ListFilesInput,
        ),
        StructuredTool.from_function(
            func=partial(_read_file, repo_url),
            name="read_file",
            description="Read the full contents of a file (truncated to AGENT_MAX_FILE_CHARS).",
            args_schema=ReadFileInput,
        ),
        StructuredTool.from_function(
            func=partial(_search_code, repo_url),
            name="search_code",
            description="Search for a keyword or symbol across the repository using GitHub code search.",
            args_schema=SearchCodeInput,
        ),
        StructuredTool.from_function(
            func=partial(_get_file_summary, repo_url),
            name="get_file_summary",
            description="Get a short preview (~200 tokens) of a file before deciding to read it fully.",
            args_schema=GetFileSummaryInput,
        ),
    ]
