import logging

from django.db.models import Q
from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


def _save_finding(
    session_id: str,
    file_path: str,
    note: str,
    confidence: float = 0.8,
    evidence_snippet: str = "",
    search_term: str = "",
) -> str:
    from research_sessions.models import Finding, ResearchSession
    try:
        session = ResearchSession.objects.select_related("repository").get(pk=session_id)
    except ResearchSession.DoesNotExist:
        return f"Session {session_id} not found."
    Finding.objects.create(
        session=session,
        repository=session.repository,
        file_path=file_path,
        note=note,
        confidence=max(0.0, min(1.0, confidence)),
        evidence_snippet=evidence_snippet[:1000],
        search_term=search_term[:255],
    )
    logger.debug("save_finding session=%s file=%r confidence=%.2f", session_id, file_path, confidence)
    return f"Finding saved for {file_path!r} (confidence={confidence:.2f})."


def _get_previous_findings(session_id: str, query: str = "") -> str:
    from research_sessions.models import Finding, ResearchSession
    try:
        session = ResearchSession.objects.select_related("repository").get(pk=session_id)
    except ResearchSession.DoesNotExist:
        return f"Session {session_id} not found."
    qs = Finding.objects.filter(repository=session.repository).order_by("-confidence", "-created_at")
    if query:
        keywords = [w.strip().lower() for w in query.split() if len(w.strip()) > 2]
        filters = Q()
        for kw in keywords:
            filters |= Q(note__icontains=kw) | Q(file_path__icontains=kw)
        if filters:
            qs = qs.filter(filters)
    findings = list(qs[:20])
    if not findings:
        return "No previous findings for this repository."
    lines = [f"[{f.file_path}] (confidence={f.confidence:.2f}) {f.note}" for f in findings]
    logger.debug("get_previous_findings session=%s query=%r → %d findings", session_id, query, len(findings))
    return "\n".join(lines)


def _list_past_sessions(session_id: str) -> str:
    from research_sessions.models import ResearchSession
    try:
        session = ResearchSession.objects.select_related("repository").get(pk=session_id)
    except ResearchSession.DoesNotExist:
        return f"Session {session_id} not found."
    past = (
        ResearchSession.objects
        .filter(repository=session.repository, status=ResearchSession.Status.COMPLETED)
        .exclude(pk=session_id)
        .order_by("-created_at")[:10]
    )
    if not past:
        return "No completed past sessions for this repository."
    lines = []
    for s in past:
        safe_answer = s.answer.encode("ascii", errors="replace").decode("ascii")
        if safe_answer.count("?") / max(len(safe_answer), 1) > 0.10:
            continue
        lines.append(f"[{s.created_at:%Y-%m-%d}] {s.question[:80]} — {safe_answer[:200]}")
    return "\n".join(lines) if lines else "No usable past sessions for this repository."


class SaveFindingInput(BaseModel):
    file_path: str = Field(description="Path of the file this finding relates to.")
    note: str = Field(description="The finding or observation to save.")
    confidence: float = Field(default=0.8, description="Confidence score from 0.0 (low) to 1.0 (high).")
    evidence_snippet: str = Field(default="", description="Exact code lines that support this finding.")
    search_term: str = Field(default="", description="The search query that led to this finding.")

class GetPreviousFindingsInput(BaseModel):
    query: str = Field(default="", description="Keywords to filter findings by relevance. Leave empty for recent findings.")

class ListPastSessionsInput(BaseModel):
    pass


def build_db_tools(session_id: str) -> list:
    def save_finding(
        file_path: str,
        note: str,
        confidence: float = 0.8,
        evidence_snippet: str = "",
        search_term: str = "",
    ) -> str:
        return _save_finding(session_id, file_path, note, confidence, evidence_snippet, search_term)

    def get_previous_findings(query: str = "") -> str:
        return _get_previous_findings(session_id, query)

    def list_past_sessions() -> str:
        return _list_past_sessions(session_id)

    return [
        StructuredTool.from_function(
            func=save_finding,
            name="save_finding",
            description="Persist a notable finding about a specific file to the database.",
            args_schema=SaveFindingInput,
        ),
        StructuredTool.from_function(
            func=get_previous_findings,
            name="get_previous_findings",
            description="Retrieve findings saved in past sessions for this repository, ordered by confidence.",
            args_schema=GetPreviousFindingsInput,
        ),
        StructuredTool.from_function(
            func=list_past_sessions,
            name="list_past_sessions",
            description="List completed research sessions for this repository with their questions and answers.",
            args_schema=ListPastSessionsInput,
        ),
    ]
