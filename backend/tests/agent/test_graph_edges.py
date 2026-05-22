import time
from unittest.mock import MagicMock
from django.test import TestCase, override_settings
from langgraph.graph import END
from agent.graph.edges import should_continue


def _make_state(messages, iterations=0, time_start=None):
    return {
        "messages": messages,
        "session_id": "test-session",
        "repo_url": "https://github.com/psf/requests",
        "iterations": iterations,
        "tokens_used": 0,
        "time_start": time_start if time_start is not None else time.monotonic(),
    }


def _ai_with_tool_calls():
    msg = MagicMock()
    msg.tool_calls = [{"name": "list_files", "args": {}, "id": "tc1"}]
    return msg


def _ai_no_tool_calls():
    msg = MagicMock()
    msg.tool_calls = []
    return msg


class TestShouldContinue(TestCase):
    @override_settings(AGENT_MAX_ITERATIONS=15, CELERY_TASK_SOFT_TIME_LIMIT=120)
    def test_tool_calls_present_returns_execute_tools(self):
        state = _make_state([_ai_with_tool_calls()])
        result = should_continue(state)
        self.assertEqual(result, "execute_tools")

    @override_settings(AGENT_MAX_ITERATIONS=15, CELERY_TASK_SOFT_TIME_LIMIT=120)
    def test_max_iterations_returns_end(self):
        state = _make_state([_ai_with_tool_calls()], iterations=15)
        result = should_continue(state)
        self.assertEqual(result, END)

    @override_settings(AGENT_MAX_ITERATIONS=15, CELERY_TASK_SOFT_TIME_LIMIT=120)
    def test_time_budget_exceeded_returns_end(self):
        old_start = time.monotonic() - 100
        state = _make_state([_ai_with_tool_calls()], time_start=old_start)
        result = should_continue(state)
        self.assertEqual(result, END)

    @override_settings(AGENT_MAX_ITERATIONS=15, CELERY_TASK_SOFT_TIME_LIMIT=120)
    def test_no_tool_calls_returns_end(self):
        state = _make_state([_ai_no_tool_calls()])
        result = should_continue(state)
        self.assertEqual(result, END)
