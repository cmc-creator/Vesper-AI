"""
Multi-Model AI Router for Vesper
Supports: Anthropic Claude, OpenAI GPT, Google Gemini, Ollama (local)
Routes tasks to the best model based on type and availability
"""

import os
from typing import Dict, List, Optional, Any
import anthropic
from openai import OpenAI
import google.generativeai as genai
import ollama
from enum import Enum

class TaskType(Enum):
    CODE = "code"
    CHAT = "chat"
    SEARCH = "search"
    ANALYSIS = "analysis"
    CREATIVE = "creative"
    
class ModelProvider(Enum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GOOGLE = "google"
    OLLAMA = "ollama"

class AIRouter:
    """Intelligent AI model router with fallback support"""
    
    def __init__(self):
        # Initialize clients
        self.anthropic_client = None
        self.openai_client = None
        self.google_configured = False
        self.ollama_available = False
        
        # Configure Anthropic (Claude)
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        if anthropic_key:
            self.anthropic_client = anthropic.Anthropic(api_key=anthropic_key)
            print("✅ Anthropic Claude configured")
        
        # Configure OpenAI
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            self.openai_client = OpenAI(api_key=openai_key)
            print("✅ OpenAI GPT configured")
        
        # Configure Google Gemini
        google_key = os.getenv("GOOGLE_API_KEY")
        if google_key:
            genai.configure(api_key=google_key)
            self.google_configured = True
            print("✅ Google Gemini configured")
        
        # Check Ollama availability
        try:
            ollama.list()
            self.ollama_available = True
            print("✅ Ollama (local) available")
        except Exception:
            print("⚠️  Ollama not available (install: https://ollama.ai)")
        
        # Routing strategy: which provider to use for each task
        self.routing_strategy = {
            TaskType.CODE: [
                ModelProvider.ANTHROPIC,  # Claude best for code
                ModelProvider.OPENAI,
                ModelProvider.GOOGLE,
                ModelProvider.OLLAMA
            ],
            TaskType.CHAT: [
                ModelProvider.GOOGLE,     # Gemini Flash free & fast
                ModelProvider.OPENAI,
                ModelProvider.ANTHROPIC,
                ModelProvider.OLLAMA
            ],
            TaskType.SEARCH: [
                ModelProvider.GOOGLE,     # Gemini has grounding
                ModelProvider.OPENAI,
                ModelProvider.ANTHROPIC,
                ModelProvider.OLLAMA
            ],
            TaskType.ANALYSIS: [
                ModelProvider.OPENAI,     # GPT-4o great for analysis
                ModelProvider.ANTHROPIC,
                ModelProvider.GOOGLE,
                ModelProvider.OLLAMA
            ],
            TaskType.CREATIVE: [
                ModelProvider.ANTHROPIC,  # Claude creative
                ModelProvider.OPENAI,
                ModelProvider.GOOGLE,
                ModelProvider.OLLAMA
            ]
        }
        
        # Model selection per provider
        self.models = {
            ModelProvider.ANTHROPIC: "claude-sonnet-4-20250514",
            ModelProvider.OPENAI: "gpt-4o-mini",  # Fast & cheap
            ModelProvider.GOOGLE: "gemini-2.0-flash-exp",  # Free tier!
            ModelProvider.OLLAMA: "llama3.1:70b"  # Best local model
        }
    
    def get_available_provider(self, task_type: TaskType) -> Optional[ModelProvider]:
        """Get first available provider for task type"""
        for provider in self.routing_strategy[task_type]:
            if self.is_provider_available(provider):
                return provider
        return None
    
    def is_provider_available(self, provider: ModelProvider) -> bool:
        """Check if provider is configured and available"""
        if provider == ModelProvider.ANTHROPIC:
            return self.anthropic_client is not None
        elif provider == ModelProvider.OPENAI:
            return self.openai_client is not None
        elif provider == ModelProvider.GOOGLE:
            return self.google_configured
        elif provider == ModelProvider.OLLAMA:
            return self.ollama_available
        return False
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        task_type: TaskType = TaskType.CHAT,
        tools: Optional[List[Dict]] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        preferred_provider: Optional[ModelProvider] = None
    ) -> Dict[str, Any]:
        """
        Route chat request to best available provider
        
        Args:
            messages: Chat messages in standard format
            task_type: Type of task (code, chat, search, etc.)
            tools: Function calling tools (Claude/OpenAI format)
            max_tokens: Max response tokens
            temperature: Response randomness (0-1)
            preferred_provider: Override automatic routing
        
        Returns:
            Standardized response with content, provider info, usage stats
        """
        # Get provider
        provider = preferred_provider if preferred_provider else self.get_available_provider(task_type)
        
        if not provider:
            return {
                "error": "No AI providers configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, or install Ollama.",
                "provider": None,
                "model": None
            }
        
        model = self.models[provider]
        
        try:
            if provider == ModelProvider.ANTHROPIC:
                return await self._chat_anthropic(messages, model, tools, max_tokens, temperature)
            elif provider == ModelProvider.OPENAI:
                return await self._chat_openai(messages, model, tools, max_tokens, temperature)
            elif provider == ModelProvider.GOOGLE:
                return await self._chat_google(messages, model, tools, max_tokens, temperature)
            elif provider == ModelProvider.OLLAMA:
                return await self._chat_ollama(messages, model, max_tokens, temperature)
        except Exception as e:
            # Fallback to next provider
            print(f"❌ {provider.value} failed: {e}")
            fallback_providers = [p for p in self.routing_strategy[task_type] if p != provider and self.is_provider_available(p)]
            if fallback_providers:
                print(f"🔄 Falling back to {fallback_providers[0].value}")
                return await self.chat(messages, task_type, tools, max_tokens, temperature, fallback_providers[0])
            return {"error": str(e), "provider": provider.value, "model": model}
    
    async def _chat_anthropic(self, messages, model, tools, max_tokens, temperature):
        """Chat with Anthropic Claude"""
        # Convert messages to Claude format
        system_msg = next((m["content"] for m in messages if m["role"] == "system"), None)
        claude_messages = [m for m in messages if m["role"] != "system"]
        
        kwargs = {
            "model": model,
            "messages": claude_messages,
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        
        if system_msg:
            kwargs["system"] = system_msg
        if tools:
            kwargs["tools"] = tools
        
        response = self.anthropic_client.messages.create(**kwargs)
        
        return {
            "content": response.content[0].text if response.content else "",
            "provider": ModelProvider.ANTHROPIC.value,
            "model": model,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens
            },
            "raw_response": response,
            "tool_calls": [c for c in response.content if c.type == "tool_use"] if hasattr(response, "content") else []
        }
    
    async def _chat_openai(self, messages, model, tools, max_tokens, temperature):
        """Chat with OpenAI GPT"""
        kwargs = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        
        if tools:
            # Convert Claude tools to OpenAI format
            openai_tools = [self._convert_tool_to_openai(tool) for tool in tools]
            kwargs["tools"] = openai_tools
        
        response = self.openai_client.chat.completions.create(**kwargs)
        
        return {
            "content": response.choices[0].message.content or "",
            "provider": ModelProvider.OPENAI.value,
            "model": model,
            "usage": {
                "input_tokens": response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens
            },
            "raw_response": response,
            "tool_calls": response.choices[0].message.tool_calls if response.choices[0].message.tool_calls else []
        }
    
    async def _chat_google(self, messages, model, tools, max_tokens, temperature):
        """Chat with Google Gemini"""
        # Convert messages to Gemini format
        gemini_messages = []
        for msg in messages:
            role = "user" if msg["role"] in ["system", "user"] else "model"
            gemini_messages.append({
                "role": role,
                "parts": [msg["content"]]
            })
        
        gemini_model = genai.GenerativeModel(model)
        
        generation_config = {
            "max_output_tokens": max_tokens,
            "temperature": temperature
        }
        
        # Note: Gemini's function calling format is different, simplified for now
        response = gemini_model.generate_content(
            gemini_messages,
            generation_config=generation_config
        )
        
        return {
            "content": response.text,
            "provider": ModelProvider.GOOGLE.value,
            "model": model,
            "usage": {
                "input_tokens": response.usage_metadata.prompt_token_count if hasattr(response, 'usage_metadata') else 0,
                "output_tokens": response.usage_metadata.candidates_token_count if hasattr(response, 'usage_metadata') else 0
            },
            "raw_response": response,
            "tool_calls": []  # Simplified - Gemini has different tool format
        }
    
    async def _chat_ollama(self, messages, model, max_tokens, temperature):
        """Chat with local Ollama"""
        response = ollama.chat(
            model=model,
            messages=messages,
            options={
                "num_predict": max_tokens,
                "temperature": temperature
            }
        )
        
        return {
            "content": response["message"]["content"],
            "provider": ModelProvider.OLLAMA.value,
            "model": model,
            "usage": {
                "input_tokens": 0,  # Ollama doesn't report tokens
                "output_tokens": 0
            },
            "raw_response": response,
            "tool_calls": []  # Ollama doesn't support function calling
        }
    
    def _convert_tool_to_openai(self, claude_tool: Dict) -> Dict:
        """Convert Claude tool format to OpenAI format"""
        return {
            "type": "function",
            "function": {
                "name": claude_tool["name"],
                "description": claude_tool["description"],
                "parameters": claude_tool["input_schema"]
            }
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get router statistics and availability"""
        return {
            "providers": {
                "anthropic": self.is_provider_available(ModelProvider.ANTHROPIC),
                "openai": self.is_provider_available(ModelProvider.OPENAI),
                "google": self.is_provider_available(ModelProvider.GOOGLE),
                "ollama": self.is_provider_available(ModelProvider.OLLAMA)
            },
            "models": {k.value: v for k, v in self.models.items()},
            "routing_strategy": {k.value: [p.value for p in v] for k, v in self.routing_strategy.items()}
        }


# Global router instance
router = AIRouter()
