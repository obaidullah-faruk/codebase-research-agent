from __future__ import annotations
import logging
import time
from functools import partial

from django.conf import settings
from langchain_core.messages import AIMessage, SystemMessage
from langgraph.prebuilt import ToolNode

from .state import ResearchState
from research_sessions.models import ResearchSession, SessionLog, ToolCallLog

logger = logging.getLogger(__name__)

TOKEN_BUDGET = int(getattr(settings, "AGENT_TOKEN_BUDGET", 80_000))
MAX_TOKENS = int(getattr(settings, "AGENT_MAX_TOKENS_PER_CALL", 4_096))
PRUNE_AFTER = int(getattr(settings, "AGENT_PRUNE_AFTER", 20))
TOOL_RESULT_LIMIT = int(getattr(settings, "TOOL_RESULT_MAX_CHARS", 3_000))

SYSTEM_PROMPT = """\
You are a codebase research assistant. Answer questions about GitHub repositories.
Always respond in English.

ALWAYS start by calling get_previous_findings and list_past_sessions to check prior work.
If prior findings already answer the question, answer directly — do not re-explore.

When exploring, be hierarchical:
  1. list_files("") — understand structure first
  2. get_file_summary — cheap preview before reading
  3. read_file — only 2–3 most relevant files
  4. search_code — for specific symbols or function names

Call save_finding whenever you discover something important. Include a confidence score.
When you have a complete answer, provide it as plain text and stop calling tools.

Repository: {repo_url}
"""


def call_model(state: ResearchState, llm_with_tools) -> dict:
    iteration = state["iterations"] + 1
    tokens = state["tokens_used"]

    system = SYSTEM_PROMPT.format(repo_url=state["repo_url"])
    if tokens > TOKEN_BUDGET * 0.85:
        system += "\n\nBUDGET WARNING: Token limit approaching. Provide your final answer NOW."

    messages = state["messages"]
    if len(messages) > PRUNE_AFTER:
        messages = [messages[0]] + messages[-10:]

    logger.info(
        "[session=%s] iteration=%d tokens_so_far=%d",
        state["session_id"], iteration, tokens,
    )

    response: AIMessage = llm_with_tools.invoke(
        [SystemMessage(content=system)] + messages,
    )

    usage = getattr(response, "usage_metadata", None) or {}
    new_tokens = tokens + usage.get("total_tokens", 0)

    stop = (response.response_metadata or {}).get("stop_reason", "unknown")
    logger.info(
        "[session=%s] iteration=%d stop_reason=%s tokens_total=%d",
        state["session_id"], iteration, stop, new_tokens,
    )

    return {
        "messages": [response],
        "iterations": iteration,
        "tokens_used": new_tokens,
    }


def make_tool_node(tools: list, session_id: str) -> callable:
    """Wrap LangGraph's ToolNode to add DB logging for each tool call."""
    base_node = ToolNode(tools)

    def execute_tools(state: ResearchState) -> dict:
        session = ResearchSession.objects.get(pk=session_id)
        step = state["iterations"]
        last_ai: AIMessage = state["messages"][-1]

        t0 = time.monotonic()
        result = base_node.invoke(state)
        duration_ms = int((time.monotonic() - t0) * 1000)

        for tool_call in last_ai.tool_calls:
            tool_msg = next(
                (m for m in result["messages"] if getattr(m, "tool_call_id", None) == tool_call["id"]),
                None,
            )
            output = tool_msg.content if tool_msg else ""

            # Truncate tool output before storing in messages
            if len(output) > TOOL_RESULT_LIMIT:
                output = output[:TOOL_RESULT_LIMIT] + "… [truncated — full result saved to DB]"
                if tool_msg:
                    tool_msg.content = output

            ToolCallLog.objects.create(
                session=session,
                tool_name=tool_call["name"],
                input_data=tool_call["args"],
                output_data=output,
            )
            SessionLog.objects.create(
                session=session,
                kind=SessionLog.Kind.TOOL_CALL,
                step=step,
                data={"tool": tool_call["name"], "duration_ms": duration_ms},
            )
            logger.info(
                "[session=%s] tool=%s duration=%dms",
                session_id, tool_call["name"], duration_ms,
            )

        return result

    return execute_tools
