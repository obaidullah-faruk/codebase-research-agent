import os
import shutil
import tempfile
from django.test import TestCase
from unittest.mock import patch, MagicMock

from agent.tools import build_tools
from agent.tools.local_tools import (
    _local_list_files,
    _local_read_file,
    _local_search_code,
    _local_get_file_summary,
)

_EXPECTED_TOOL_NAMES = {
    "list_files", "read_file", "search_code", "get_file_summary",
    "save_finding", "get_previous_findings", "list_past_sessions",
}


class TestBuildToolsGitHub(TestCase):
    @patch("agent.tools.github_tools.GitHubClient")
    def test_build_tools_returns_seven(self, mock_client_cls):
        mock_client_cls.from_url.return_value = MagicMock()
        tools = build_tools("https://github.com/psf/requests", "test-session-id")
        self.assertEqual(len(tools), 7)

    @patch("agent.tools.github_tools.GitHubClient")
    def test_all_tools_have_invoke(self, mock_client_cls):
        mock_client_cls.from_url.return_value = MagicMock()
        tools = build_tools("https://github.com/psf/requests", "test-session-id")
        for tool in tools:
            self.assertTrue(hasattr(tool, "invoke"), f"{tool.name} missing invoke")

    @patch("agent.tools.github_tools.GitHubClient")
    def test_tool_names(self, mock_client_cls):
        mock_client_cls.from_url.return_value = MagicMock()
        tools = build_tools("https://github.com/psf/requests", "test-session-id")
        self.assertEqual({t.name for t in tools}, _EXPECTED_TOOL_NAMES)


class TestBuildToolsLocal(TestCase):
    def test_build_tools_local_returns_seven(self):
        with tempfile.TemporaryDirectory() as tmp:
            tools = build_tools(tmp, "test-session-id")
            self.assertEqual(len(tools), 7)

    def test_local_tool_names(self):
        with tempfile.TemporaryDirectory() as tmp:
            tools = build_tools(tmp, "test-session-id")
            self.assertEqual({t.name for t in tools}, _EXPECTED_TOOL_NAMES)


class TestLocalListFiles(TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _create(self, rel_path: str, content: str = "") -> str:
        full = os.path.join(self.tmp, rel_path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w") as f:
            f.write(content)
        return full

    def test_lists_files_at_root(self):
        self._create("foo.py", "x=1")
        self._create("bar.py", "y=2")
        result = _local_list_files(self.tmp)
        self.assertIn("foo.py", result)
        self.assertIn("bar.py", result)

    def test_ignores_git_dir(self):
        os.makedirs(os.path.join(self.tmp, ".git"))
        result = _local_list_files(self.tmp)
        self.assertNotIn(".git", result)

    def test_nonexistent_path(self):
        result = _local_list_files(self.tmp, "nonexistent")
        self.assertIn("Error", result)

    def test_path_traversal_blocked(self):
        result = _local_list_files(self.tmp, "../../etc")
        self.assertIn("Error", result)


class TestLocalReadFile(TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_reads_file(self):
        path = os.path.join(self.tmp, "hello.py")
        with open(path, "w") as f:
            f.write("print('hello')")
        result = _local_read_file(self.tmp, "hello.py")
        self.assertEqual(result, "print('hello')")

    def test_missing_file(self):
        result = _local_read_file(self.tmp, "missing.py")
        self.assertIn("Error", result)

    def test_path_traversal_blocked(self):
        result = _local_read_file(self.tmp, "../../etc/passwd")
        self.assertIn("Error", result)

    @patch.dict(os.environ, {"AGENT_MAX_FILE_CHARS": "10"})
    def test_truncation(self):
        path = os.path.join(self.tmp, "big.py")
        with open(path, "w") as f:
            f.write("x" * 100)
        result = _local_read_file(self.tmp, "big.py")
        self.assertIn("truncated", result)


class TestLocalSearchCode(TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_finds_match(self):
        path = os.path.join(self.tmp, "app.py")
        with open(path, "w") as f:
            f.write("def my_function():\n    pass\n")
        result = _local_search_code(self.tmp, "my_function")
        self.assertIn("app.py", result)
        self.assertIn("my_function", result)

    def test_no_match(self):
        path = os.path.join(self.tmp, "app.py")
        with open(path, "w") as f:
            f.write("x = 1\n")
        result = _local_search_code(self.tmp, "nonexistent_symbol")
        self.assertIn("No results", result)


class TestLocalGetFileSummary(TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_short_file_returned_fully(self):
        path = os.path.join(self.tmp, "small.py")
        content = "x = 1"
        with open(path, "w") as f:
            f.write(content)
        result = _local_get_file_summary(self.tmp, "small.py")
        self.assertEqual(result, content)

    def test_long_file_truncated(self):
        path = os.path.join(self.tmp, "big.py")
        with open(path, "w") as f:
            f.write("y" * 2000)
        result = _local_get_file_summary(self.tmp, "big.py")
        self.assertIn("truncated", result)
