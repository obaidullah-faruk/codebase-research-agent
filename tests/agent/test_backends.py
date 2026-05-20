from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from langchain_ollama import ChatOllama
from langchain_aws import ChatBedrock
from agent.backends import get_llm


class TestGetLlm(TestCase):
    @override_settings(LLM_BACKEND="ollama", OLLAMA_MODEL="llama3.1", OLLAMA_BASE_URL="http://localhost:11434")
    def test_ollama_returns_chat_ollama(self):
        result = get_llm()
        self.assertIsInstance(result, ChatOllama)
        self.assertTrue(hasattr(result, "bind_tools"))

    @override_settings(LLM_BACKEND="bedrock", BEDROCK_MODEL="us.amazon.nova-lite-v1:0", BEDROCK_REGION="us-east-1")
    def test_bedrock_returns_chat_bedrock(self):
        result = get_llm()
        self.assertIsInstance(result, ChatBedrock)
        self.assertTrue(hasattr(result, "bind_tools"))

    @override_settings(LLM_BACKEND="unknown_backend")
    def test_unknown_backend_raises_value_error(self):
        with self.assertRaises(ValueError) as ctx:
            get_llm()
        self.assertIn("unknown_backend", str(ctx.exception))
