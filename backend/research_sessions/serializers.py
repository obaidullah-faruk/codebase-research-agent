import os
from rest_framework import serializers
from .models import ResearchSession, Finding, ToolCallLog, SessionLog


class FindingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Finding
        fields = ["id", "file_path", "note", "confidence", "evidence_snippet", "search_term", "created_at"]


class ToolCallLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ToolCallLog
        fields = ["id", "tool_name", "input_data", "output_data", "created_at"]


class SessionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionLog
        fields = ["id", "kind", "step", "data", "created_at"]


class ResearchSessionSerializer(serializers.ModelSerializer):
    repo_url = serializers.CharField(write_only=True)

    def validate_repo_url(self, value: str) -> str:
        value = value.strip()
        if value.startswith(("https://github.com/", "http://github.com/")):
            return value
        if os.path.isabs(value):
            return value
        raise serializers.ValidationError(
            "Provide a GitHub URL (https://github.com/owner/repo) "
            "or an absolute local path (/path/to/repo)."
        )
    repository_url = serializers.CharField(source="repository.url", read_only=True)
    repository_name = serializers.CharField(source="repository.name", read_only=True)
    findings = FindingSerializer(many=True, read_only=True)
    tool_calls = ToolCallLogSerializer(many=True, read_only=True)
    logs = SessionLogSerializer(many=True, read_only=True)

    class Meta:
        model = ResearchSession
        fields = [
            "id", "repo_url", "repository_url", "repository_name",
            "question", "answer", "status", "error_message",
            "tokens_used", "iterations", "created_at", "completed_at",
            "findings", "tool_calls", "logs",
        ]
        read_only_fields = [
            "id", "answer", "status", "error_message",
            "tokens_used", "iterations", "created_at", "completed_at",
            "findings", "tool_calls", "logs",
        ]
