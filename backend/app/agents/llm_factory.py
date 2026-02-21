"""
Laya Healthcare — LLM Factory
Creates the correct ChatOpenAI or AzureChatOpenAI instance based on settings.
"""

from __future__ import annotations

from langchain_openai import ChatOpenAI, AzureChatOpenAI
from app.config import settings


def get_llm(role: str = "principal"):
    """Return a LangChain chat model configured for OpenAI or Azure OpenAI.

    Args:
        role: 'principal' for the routing agent (GPT-4o),
              'child' for child agents (GPT-4o-mini or same).
    """
    if settings.use_azure:
        deployment = (
            settings.AZURE_DEPLOYMENT_PRINCIPAL
            if role == "principal"
            else settings.AZURE_DEPLOYMENT_CHILD
        )
        return AzureChatOpenAI(
            azure_deployment=deployment,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION,
            temperature=0,
            timeout=settings.LLM_TIMEOUT,
        )
    else:
        model = (
            settings.OPENAI_MODEL_PRINCIPAL
            if role == "principal"
            else settings.OPENAI_MODEL_CHILD
        )
        return ChatOpenAI(
            model=model,
            api_key=settings.OPENAI_API_KEY,
            temperature=0,
            timeout=settings.LLM_TIMEOUT,
        )
