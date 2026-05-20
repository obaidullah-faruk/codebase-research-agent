from unittest.mock import patch, MagicMock
from django.test import TestCase
from research_sessions.models import Repository, ResearchSession
from research_sessions.services import create_session


class TestCreateSession(TestCase):
    @patch("research_sessions.services.run_research_task")
    def test_repo_created_on_first_call(self, mock_task):
        mock_task.delay.return_value = None
        create_session("https://github.com/psf/requests", "What is retry logic?")
        self.assertTrue(Repository.objects.filter(url="https://github.com/psf/requests").exists())

    @patch("research_sessions.services.run_research_task")
    def test_repo_reused_on_second_call(self, mock_task):
        mock_task.delay.return_value = None
        create_session("https://github.com/psf/requests", "First question")
        create_session("https://github.com/psf/requests", "Second question")
        self.assertEqual(Repository.objects.filter(url="https://github.com/psf/requests").count(), 1)

    @patch("research_sessions.services.run_research_task")
    def test_task_queued_once_per_session(self, mock_task):
        mock_task.delay.return_value = None
        with self.captureOnCommitCallbacks(execute=True):
            create_session("https://github.com/psf/requests", "What is retry logic?")
        mock_task.delay.assert_called_once()

    @patch("research_sessions.services.run_research_task")
    def test_session_status_is_pending(self, mock_task):
        mock_task.delay.return_value = None
        session = create_session("https://github.com/psf/requests", "What is retry logic?")
        self.assertEqual(session.status, ResearchSession.Status.PENDING)
