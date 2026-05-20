import logging

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiResponse
from rest_framework import serializers
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ResearchSession
from .serializers import ResearchSessionSerializer
from .services import create_session

logger = logging.getLogger(__name__)


class SessionListCreateView(APIView):
    @extend_schema(
        summary="List research sessions",
        tags=["Sessions"],
        responses={200: ResearchSessionSerializer(many=True)},
    )
    def get(self, request):
        sessions = ResearchSession.objects.select_related("repository").order_by("-created_at")
        return Response(ResearchSessionSerializer(sessions, many=True).data)

    @extend_schema(
        summary="Create and queue a research session",
        tags=["Sessions"],
        request=ResearchSessionSerializer,
        responses={201: ResearchSessionSerializer},
    )
    def post(self, request):
        repo_url = request.data.get("repo_url", "").strip()
        question = request.data.get("question", "").strip()

        errors = {}
        if not repo_url:
            errors["repo_url"] = "This field is required."
        if not question:
            errors["question"] = "This field is required."
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        session = create_session(repo_url=repo_url, question=question)
        return Response(ResearchSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class SessionDetailView(APIView):
    @extend_schema(
        summary="Retrieve a session with findings, tool calls, and logs",
        tags=["Sessions"],
        responses={200: ResearchSessionSerializer, 404: OpenApiResponse(description="Not found")},
    )
    def get(self, request, pk):
        session = get_object_or_404(
            ResearchSession.objects.select_related("repository").prefetch_related(
                "findings", "tool_calls", "logs"
            ),
            pk=pk,
        )
        return Response(ResearchSessionSerializer(session).data)


class SessionCancelView(APIView):
    @extend_schema(
        summary="Cancel a pending or running session",
        tags=["Sessions"],
        request=None,
        responses={
            200: inline_serializer(
                name="SessionCancelResponse",
                fields={"detail": serializers.CharField()},
            ),
            400: inline_serializer(
                name="SessionCancelError",
                fields={"detail": serializers.CharField()},
            ),
        },
    )
    def post(self, request, pk):
        session = get_object_or_404(ResearchSession, pk=pk)
        if session.status not in (ResearchSession.Status.PENDING, ResearchSession.Status.RUNNING):
            return Response({"detail": "Session is not active."}, status=status.HTTP_400_BAD_REQUEST)

        from celery.app.control import Control
        from config.celery import app as celery_app
        Control(celery_app).revoke(str(session.pk), terminate=True)

        session.status = ResearchSession.Status.FAILED
        session.error_message = "Cancelled by user."
        session.save(update_fields=["status", "error_message"])
        logger.info("[session=%s] cancelled by user", pk)
        return Response({"detail": "Session cancelled."})
