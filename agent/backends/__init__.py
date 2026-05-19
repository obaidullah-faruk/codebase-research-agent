from __future__ import annotations
import logging
from django.conf import settings
from langchain_core.language_models import BaseChatModel

logger = logging.getLogger(__name__)


def get_llm() -> BaseChatModel:
    """Return the configured LangChain chat model. Supports bind_tools() natively."""
    backend = getattr(settings, "LLM_BACKEND", "ollama").lower()

    if backend == "ollama":
        from langchain_ollama import ChatOllama
        model = getattr(settings, "OLLAMA_MODEL", "qwen2.5:14b")
        base_url = getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")
        logger.debug("Using Ollama backend: model=%s url=%s", model, base_url)
        return ChatOllama(model=model, base_url=base_url)

    if backend == "bedrock":
        from langchain_aws import ChatBedrock
        model_id = getattr(settings, "BEDROCK_MODEL", "us.amazon.nova-lite-v1:0")
        region = getattr(settings, "BEDROCK_REGION", "us-east-1")
        logger.debug("Using Bedrock backend: model=%s region=%s", model_id, region)
        return ChatBedrock(model_id=model_id, region_name=region)

    raise ValueError(f"Unknown LLM_BACKEND: {backend!r}. Choose 'ollama' or 'bedrock'.")
