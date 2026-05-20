from django.test import TestCase
from unittest.mock import patch, MagicMock


class TestBuildTools(TestCase):
    @patch("agent.tools.github_tools.GitHubClient")
    def test_build_tools_returns_seven(self, mock_client_cls):
        mock_client_cls.from_url.return_value = MagicMock()
        from agent.tools import build_tools
        tools = build_tools("https://github.com/psf/requests", "test-session-id")
        self.assertEqual(len(tools), 7)

    @patch("agent.tools.github_tools.GitHubClient")
    def test_all_tools_have_invoke(self, mock_client_cls):
        mock_client_cls.from_url.return_value = MagicMock()
        from agent.tools import build_tools
        tools = build_tools("https://github.com/psf/requests", "test-session-id")
        for tool in tools:
            self.assertTrue(hasattr(tool, "invoke"), f"{tool.name} missing invoke")

    @patch("agent.tools.github_tools.GitHubClient")
    def test_tool_names(self, mock_client_cls):
        mock_client_cls.from_url.return_value = MagicMock()
        from agent.tools import build_tools
        tools = build_tools("https://github.com/psf/requests", "test-session-id")
        names = [t.name for t in tools]
        self.assertIn("list_files", names)
        self.assertIn("read_file", names)
        self.assertIn("search_code", names)
        self.assertIn("get_file_summary", names)
        self.assertIn("save_finding", names)
        self.assertIn("get_previous_findings", names)
        self.assertIn("list_past_sessions", names)
