from __future__ import annotations
from typing import Annotated
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict


class ResearchState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    session_id: str
    repo_url: str
    iterations: int
    tokens_used: int
    time_start: float   # monotonic timestamp set when the graph starts
