import logging
import os

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

_IGNORE_DIRS = {".git", "__pycache__", "node_modules", ".venv", "venv", ".mypy_cache", ".pytest_cache"}
_TEXT_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rs", ".rb", ".php",
    ".c", ".cpp", ".h", ".hpp", ".cs", ".swift", ".kt", ".scala", ".sh", ".bash",
    ".zsh", ".fish", ".yaml", ".yml", ".toml", ".json", ".xml", ".html", ".css",
    ".scss", ".md", ".rst", ".txt", ".env", ".cfg", ".ini", ".conf", ".dockerfile",
    ".makefile", ".sql", ".graphql", ".proto",
}


def _is_text_file(path: str) -> bool:
    _, ext = os.path.splitext(path.lower())
    return ext in _TEXT_EXTENSIONS or os.path.basename(path).lower() in {
        "dockerfile", "makefile", "procfile", "gemfile", "rakefile",
    }


def _local_list_files(repo_path: str, path: str = "") -> str:
    target = os.path.join(repo_path, path) if path else repo_path
    target = os.path.normpath(target)
    if not target.startswith(os.path.normpath(repo_path)):
        return "Error: path traversal outside repository root is not allowed."
    try:
        entries = sorted(os.scandir(target), key=lambda e: (not e.is_dir(), e.name))
    except FileNotFoundError:
        return f"Error: path {path!r} does not exist."
    except NotADirectoryError:
        return f"Path {path!r} is a file, not a directory."
    except PermissionError:
        return f"Error: permission denied for {path!r}."

    lines = []
    for entry in entries:
        if entry.name in _IGNORE_DIRS:
            continue
        rel = os.path.relpath(entry.path, repo_path)
        tag = "[dir]" if entry.is_dir() else "[file]"
        lines.append(f"{tag} {rel}")
    logger.debug("local list_files repo=%s path=%r → %d items", repo_path, path, len(lines))
    return "\n".join(lines) or "(empty directory)"


def _local_read_file(repo_path: str, path: str) -> str:
    max_chars = int(os.environ.get("AGENT_MAX_FILE_CHARS", 8000))
    target = os.path.normpath(os.path.join(repo_path, path))
    if not target.startswith(os.path.normpath(repo_path)):
        return "Error: path traversal outside repository root is not allowed."
    try:
        with open(target, "r", encoding="utf-8", errors="replace") as fh:
            content = fh.read()
    except FileNotFoundError:
        return f"Error: file {path!r} does not exist."
    except IsADirectoryError:
        return f"Error: {path!r} is a directory, not a file."
    except PermissionError:
        return f"Error: permission denied reading {path!r}."
    if len(content) > max_chars:
        content = content[:max_chars] + f"\n\n[truncated at {max_chars} chars]"
    logger.debug("local read_file repo=%s path=%r → %d chars", repo_path, path, len(content))
    return content


def _local_search_code(repo_path: str, query: str) -> str:
    query_lower = query.lower()
    matches: list[str] = []
    repo_norm = os.path.normpath(repo_path)
    for dirpath, dirnames, filenames in os.walk(repo_norm):
        dirnames[:] = [d for d in dirnames if d not in _IGNORE_DIRS]
        for filename in filenames:
            full_path = os.path.join(dirpath, filename)
            if not _is_text_file(full_path):
                continue
            try:
                with open(full_path, "r", encoding="utf-8", errors="replace") as fh:
                    for lineno, line in enumerate(fh, 1):
                        if query_lower in line.lower():
                            rel = os.path.relpath(full_path, repo_norm)
                            matches.append(f"{rel}:{lineno}: {line.rstrip()}")
                            if len(matches) >= 50:
                                break
            except (PermissionError, OSError):
                continue
            if len(matches) >= 50:
                break
    if not matches:
        return f"No results for {query!r}."
    logger.debug("local search_code query=%r → %d results", query, len(matches))
    result = "\n".join(matches)
    if len(matches) == 50:
        result += "\n\n[results truncated at 50 matches]"
    return result


def _local_get_file_summary(repo_path: str, path: str) -> str:
    preview_chars = 800
    target = os.path.normpath(os.path.join(repo_path, path))
    if not target.startswith(os.path.normpath(repo_path)):
        return "Error: path traversal outside repository root is not allowed."
    try:
        with open(target, "r", encoding="utf-8", errors="replace") as fh:
            content = fh.read(preview_chars + 1)
    except FileNotFoundError:
        return f"Error: file {path!r} does not exist."
    except IsADirectoryError:
        return f"Error: {path!r} is a directory, not a file."
    except PermissionError:
        return f"Error: permission denied reading {path!r}."
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


def build_local_tools(repo_path: str) -> list:
    def list_files(path: str = "") -> str:
        return _local_list_files(repo_path, path)

    def read_file(path: str) -> str:
        return _local_read_file(repo_path, path)

    def search_code(query: str) -> str:
        return _local_search_code(repo_path, query)

    def get_file_summary(path: str) -> str:
        return _local_get_file_summary(repo_path, path)

    return [
        StructuredTool.from_function(
            func=list_files,
            name="list_files",
            description="List files and directories at a path in the local repository.",
            args_schema=ListFilesInput,
        ),
        StructuredTool.from_function(
            func=read_file,
            name="read_file",
            description="Read the full contents of a file (truncated to AGENT_MAX_FILE_CHARS).",
            args_schema=ReadFileInput,
        ),
        StructuredTool.from_function(
            func=search_code,
            name="search_code",
            description="Search for a keyword or symbol across all text files in the local repository.",
            args_schema=SearchCodeInput,
        ),
        StructuredTool.from_function(
            func=get_file_summary,
            name="get_file_summary",
            description="Get a short preview (~200 tokens) of a file before deciding to read it fully.",
            args_schema=GetFileSummaryInput,
        ),
    ]
