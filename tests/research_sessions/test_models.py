from django.test import TestCase
from research_sessions.models import Repository, ResearchSession, Finding, SessionLog


class TestRepositoryStr(TestCase):
    def test_str_returns_name(self):
        repo = Repository(name="psf/requests", url="https://github.com/psf/requests")
        self.assertEqual(str(repo), "psf/requests")


class TestResearchSessionDefaults(TestCase):
    def test_default_status_is_pending(self):
        repo = Repository.objects.create(name="psf/requests", url="https://github.com/psf/requests")
        session = ResearchSession.objects.create(repository=repo, question="What is this?")
        self.assertEqual(session.status, ResearchSession.Status.PENDING)


class TestFindingConfidence(TestCase):
    def test_confidence_default(self):
        repo = Repository.objects.create(name="psf/requests", url="https://github.com/psf/requests")
        session = ResearchSession.objects.create(repository=repo, question="test")
        finding = Finding.objects.create(
            session=session,
            repository=repo,
            file_path="src/main.py",
            note="Some finding",
        )
        self.assertEqual(finding.confidence, 0.8)

    def test_confidence_custom(self):
        repo = Repository.objects.create(name="psf/requests", url="https://github.com/psf/requests")
        session = ResearchSession.objects.create(repository=repo, question="test")
        finding = Finding.objects.create(
            session=session,
            repository=repo,
            file_path="src/main.py",
            note="High confidence",
            confidence=0.95,
        )
        self.assertAlmostEqual(finding.confidence, 0.95)


class TestSessionLogKinds(TestCase):
    def test_all_four_kinds_exist(self):
        kinds = list(SessionLog.Kind)
        kind_values = [k.value for k in kinds]
        self.assertIn("start", kind_values)
        self.assertIn("tool_call", kind_values)
        self.assertIn("answer", kind_values)
        self.assertIn("error", kind_values)
        self.assertEqual(len(kinds), 4)
