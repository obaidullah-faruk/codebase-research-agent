import os
import base64
import requests


class GitHubClient:
    BASE = "https://api.github.com"

    def __init__(self, owner: str, repo: str):
        self.owner = owner
        self.repo = repo
        token = os.environ.get("GITHUB_TOKEN", "")
        self.headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if token:
            self.headers["Authorization"] = f"Bearer {token}"

    def _get(self, path: str, params: dict | None = None) -> dict | list:
        url = f"{self.BASE}{path}"
        resp = requests.get(url, headers=self.headers, params=params or {}, timeout=15)
        resp.raise_for_status()
        return resp.json()

    def list_contents(self, path: str = "") -> list[dict]:
        return self._get(f"/repos/{self.owner}/{self.repo}/contents/{path}")

    def get_file_content(self, path: str) -> str:
        data = self._get(f"/repos/{self.owner}/{self.repo}/contents/{path}")
        if data.get("encoding") == "base64":
            return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
        return data.get("content", "")

    def search_code(self, query: str) -> list[dict]:
        results = self._get(
            "/search/code",
            params={"q": f"{query} repo:{self.owner}/{self.repo}", "per_page": 10},
        )
        return results.get("items", [])

    @classmethod
    def from_url(cls, repo_url: str) -> "GitHubClient":
        repo_url = repo_url.rstrip("/")
        if repo_url.startswith("https://github.com/"):
            repo_url = repo_url[len("https://github.com/"):]
        parts = repo_url.split("/")
        if len(parts) < 2:
            raise ValueError(f"Cannot parse repo URL: {repo_url}")
        return cls(parts[0], parts[1])
