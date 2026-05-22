from __future__ import annotations
from functools import partial

from langgraph.graph import StateGraph, END

from .state import ResearchState
from .nodes import call_model, make_tool_node
from .edges import should_continue
from agent.backends import get_llm
from agent.tools import build_tools


def compile_graph(repo_url: str, session_id: str):
    """Build and compile a fresh LangGraph for this session."""
    tools = build_tools(repo_url=repo_url, session_id=session_id)
    llm = get_llm().bind_tools(tools)

    tool_node = make_tool_node(tools, session_id)

    graph = StateGraph(ResearchState)
    graph.add_node("call_model", partial(call_model, llm_with_tools=llm))
    graph.add_node("execute_tools", tool_node)

    graph.set_entry_point("call_model")
    graph.add_conditional_edges(
        "call_model",
        should_continue,
        {"execute_tools": "execute_tools", END: END},
    )
    graph.add_edge("execute_tools", "call_model")

    return graph.compile()
