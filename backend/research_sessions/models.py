import os
import uuid
from django.core.exceptions import ValidationError
from django.db import models


def _validate_repo_source(value: str) -> None:
    """Accept GitHub URLs or absolute local paths; reject everything else."""
    if value.startswith(("https://github.com/", "http://github.com/")):
        return
    if os.path.isabs(value):
        return
    raise ValidationError(
        "Enter a GitHub URL (https://github.com/owner/repo) "
        "or an absolute local path (/path/to/repo)."
    )


class Repository(models.Model):
    url = models.CharField(max_length=2000, unique=True, validators=[_validate_repo_source])
    name = models.CharField(max_length=255)
    last_analyzed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "repositories"

    def __str__(self):
        return self.name


class ResearchSession(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    repository = models.ForeignKey(Repository, on_delete=models.CASCADE, related_name="sessions")
    question = models.TextField()
    answer = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    error_message = models.TextField(blank=True)
    tokens_used = models.IntegerField(default=0)
    iterations = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["repository", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.repository.name} — {self.question[:60]}"


class Finding(models.Model):
    session = models.ForeignKey(ResearchSession, on_delete=models.CASCADE, related_name="findings")
    repository = models.ForeignKey(Repository, on_delete=models.CASCADE, related_name="findings")
    file_path = models.CharField(max_length=500)
    note = models.TextField()
    confidence = models.FloatField(default=0.8)
    evidence_snippet = models.TextField(blank=True)
    search_term = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["repository", "-created_at"]),
            models.Index(fields=["repository", "-confidence"]),
        ]

    def __str__(self):
        return f"{self.file_path}: {self.note[:60]}"


class ToolCallLog(models.Model):
    session = models.ForeignKey(ResearchSession, on_delete=models.CASCADE, related_name="tool_calls")
    tool_name = models.CharField(max_length=100)
    input_data = models.JSONField()
    output_data = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["session", "-created_at"])]

    def __str__(self):
        return f"{self.tool_name} @ {self.created_at:%H:%M:%S}"


class SessionLog(models.Model):
    """Lightweight timeline of notable events during agent execution."""

    class Kind(models.TextChoices):
        START = "start", "Started"
        TOOL_CALL = "tool_call", "Tool Call"
        ANSWER = "answer", "Answer Generated"
        ERROR = "error", "Error"

    session = models.ForeignKey(ResearchSession, on_delete=models.CASCADE, related_name="logs")
    kind = models.CharField(max_length=20, choices=Kind.choices)
    step = models.PositiveSmallIntegerField(default=0)
    data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["session", "step"])]
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.get_kind_display()} @ step {self.step}"
