from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from research_sessions.models import Repository, ResearchSession


class TestSessionListCreateView(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch("research_sessions.services.run_research_task")
    def test_create_returns_201(self, mock_task):
        mock_task.delay.return_value = None
        response = self.client.post(
            reverse("session-list-create"),
            {"repo_url": "https://github.com/psf/requests", "question": "How does retry work?"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "pending")

    def test_create_missing_repo_url_returns_400(self):
        response = self.client.post(
            reverse("session-list-create"),
            {"question": "How does retry work?"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("repo_url", response.data)

    def test_create_missing_question_returns_400(self):
        response = self.client.post(
            reverse("session-list-create"),
            {"repo_url": "https://github.com/psf/requests"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("question", response.data)

    @patch("research_sessions.services.run_research_task")
    def test_list_returns_200(self, mock_task):
        mock_task.delay.return_value = None
        repo = Repository.objects.create(name="psf/requests", url="https://github.com/psf/requests")
        ResearchSession.objects.create(repository=repo, question="test?")
        response = self.client.get(reverse("session-list-create"))
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)


class TestSessionDetailView(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_detail_returns_200(self):
        repo = Repository.objects.create(name="psf/requests", url="https://github.com/psf/requests")
        session = ResearchSession.objects.create(repository=repo, question="test?")
        response = self.client.get(reverse("session-detail", kwargs={"pk": str(session.pk)}))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(str(response.data["id"]), str(session.pk))

    def test_nonexistent_returns_404(self):
        import uuid
        response = self.client.get(
            reverse("session-detail", kwargs={"pk": str(uuid.uuid4())})
        )
        self.assertEqual(response.status_code, 404)
