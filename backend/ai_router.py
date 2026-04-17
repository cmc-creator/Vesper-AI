"""
Multi-Model AI Router for Vesper
Supports: Anthropic Claude, OpenAI GPT, Google Gemini, Ollama (local)
Routes tasks to the best model based on type and availability
"""

import os
import json
from typing import Dict, List, Optional, Any
from enum import Enum

# Import providers with graceful fallback
try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    anthropic = None
    ANTHROPIC_AVAILABLE = False
    print("[WARN] anthropic not installed")

try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    AsyncOpenAI = None
    OPENAI_AVAILABLE = False
    print("[WARN] openai not installed")

try:
    from google import genai
    GOOGLE_AVAILABLE = True
except ImportError:
    genai = None
    GOOGLE_AVAILABLE = False
    print("[WARN] google-genai not installed")

try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    ollama = None
    OLLAMA_AVAILABLE = False
    print("[WARN] ollama not installed")

try:
    from groq import AsyncGroq
    GROQ_AVAILABLE = True
except ImportError:
    AsyncGroq = None
    GROQ_AVAILABLE = False
    print("[WARN] groq not installed (pip install groq)")

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
    GROQ = "groq"

class AIRouter:
    """Intelligent AI model router with fallback support"""
    
    def __init__(self):
        # Initialize clients
        self.anthropic_client = None
        self.openai_client = None
        self.google_client = None  # Changed from google_configured to google_client
        self.ollama_available = False
        self.groq_client = None
        
        # Detect environment: local vs production
        self.is_local = self._detect_local_environment()
        
        # Configure Anthropic (Claude)
        if ANTHROPIC_AVAILABLE:
            anthropic_key = os.getenv("ANTHROPIC_API_KEY")
            if anthropic_key:
                self.anthropic_client = anthropic.AsyncAnthropic(api_key=anthropic_key)
                print("[OK] Anthropic Claude configured (async client)")
        
        # Configure OpenAI
        if OPENAI_AVAILABLE:
            openai_key = os.getenv("OPENAI_API_KEY")
            if openai_key:
                self.openai_client = AsyncOpenAI(api_key=openai_key)
                print("[OK] OpenAI GPT configured")
        
        # Configure Google Gemini (new google-genai SDK with Client-based API)
        if GOOGLE_AVAILABLE:
            google_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
            if google_key:
                self.google_client = genai.Client(api_key=google_key)
                print("[OK] Google Gemini configured")
        
        # Configure Groq (free tier: 14,400 req/day, 500,000 tokens/min)
        if GROQ_AVAILABLE:
            groq_key = os.getenv("GROQ_API_KEY")
            if groq_key:
                self.groq_client = AsyncGroq(api_key=groq_key)
                print("[OK] Groq configured (free tier: 14k req/day)")

        # Check Ollama availability
        if OLLAMA_AVAILABLE:
            try:
                ollama.list()
                self.ollama_available = True
                # Determine if Ollama is actually primary (only if no cloud providers available)
                has_cloud = bool(self.anthropic_client or self.openai_client or self.google_client)
                print(f"[OK] Ollama (local) available - {'FALLBACK' if has_cloud else 'PRIMARY (no cloud keys)'}")
            except Exception:
                print("[WARN] Ollama not available (install: https://ollama.ai)")
        else:
            print("[WARN] Ollama not available (install: https://ollama.ai)")
        
        # Set up routing strategy after detecting environment
        self._setup_routing_strategy()
    
    def _detect_local_environment(self) -> bool:
        """Detect if running locally vs cloud production"""
        # Check for Railway production indicators
        database_url = os.getenv("DATABASE_URL", "")
        railway_env = os.getenv("RAILWAY_ENVIRONMENT")
        
        # If DATABASE_URL contains postgres:// (Railway), it's production
        if database_url.startswith("postgres://") or database_url.startswith("postgresql://"):
            if "railway" in database_url or railway_env:
                return False  # Production
        
        # Default to local (sqlite or localhost)
        return True
    
    def _setup_routing_strategy(self):
        """Setup routing strategy: which provider to use for each task"""
        # OLLAMA_PRIMARY=true env flag: when Ollama is available, run it first (privacy mode / local-first)
        ollama_first = (
            os.getenv("OLLAMA_PRIMARY", "").lower() in ("true", "1", "yes")
            and self.ollama_available
        )
        
        # Prioritize Cloud (Quality/Speed) for everything, Ollama as fallback
        if self.is_local:
            # LOCAL: Claude first (reliable tools), then Groq (free fast), then Gemini, then Ollama
            _local_order = [
                ModelProvider.ANTHROPIC,  # Claude — most reliable tool calling
                ModelProvider.GROQ,       # Groq — FREE (14,400 req/day, blazing fast Llama/Gemma)
                ModelProvider.GOOGLE,     # Gemini 2.5 Flash — FREE tier (1500 req/day, 1M tokens/day)
                ModelProvider.OLLAMA,     # Fully free local
                ModelProvider.OPENAI,     # Paid alternative
            ]
            if ollama_first:
                _local_order = [ModelProvider.OLLAMA] + [p for p in _local_order if p != ModelProvider.OLLAMA]
                print("[ROUTER] Ollama-first mode active (OLLAMA_PRIMARY=true)")
            self.routing_strategy = {task: list(_local_order) for task in TaskType}
        else:
            # PRODUCTION: Claude first — most reliable tool calling, critical for Google Drive/Docs features
            # Gemini second (huge free tier), Groq third (fast free fallback)
            _prod_order = [
                ModelProvider.GOOGLE,     # Gemini 2.5 Flash — PRIMARY (fast, free, works)
                ModelProvider.ANTHROPIC,  # Claude — fallback
                ModelProvider.GROQ,       # Groq Llama 3.3 70B — FREE fast fallback
                ModelProvider.OLLAMA,     # Free local (if deployed on a machine with Ollama)
                ModelProvider.OPENAI,     # Paid alternative
            ]
            self.routing_strategy = {task: list(_prod_order) for task in TaskType}
        
        # Model selection per provider — current model IDs (April 2026)
        self.models = {
            ModelProvider.GROQ: "llama-3.3-70b-versatile",   # Free tier — 14k req/day, fast + smart
            ModelProvider.OPENAI: "gpt-5.4-mini",             # Current mini — fast + affordable
            ModelProvider.GOOGLE: "gemini-2.5-flash",         # Current stable free tier
            ModelProvider.ANTHROPIC: "claude-3-5-sonnet-20241022",  # Stable, excellent tool calling
            ModelProvider.OLLAMA: "llama3.2:latest"           # Free local
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
            return self.google_client is not None  # Changed from google_configured
        elif provider == ModelProvider.OLLAMA:
            return self.ollama_available
        elif provider == ModelProvider.GROQ:
            return self.groq_client is not None
        return False
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        task_type: TaskType = TaskType.CHAT,
        tools: Optional[List[Dict]] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        preferred_provider: Optional[ModelProvider] = None,
        model_override: Optional[str] = None,
        _tried_providers: Optional[set] = None,
        _errors: Optional[list] = None,
        _warnings: Optional[list] = None
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
            _tried_providers: Internal — tracks failed providers to prevent recursion loops
            _errors: Internal — collects errors from all failed providers
        
        Returns:
            Standardized response with content, provider info, usage stats
        """
        if _tried_providers is None:
            _tried_providers = set()
        elif not isinstance(_tried_providers, set):
            _tried_providers = set(_tried_providers)  # guard: convert list → set if corrupted
        if _errors is None:
            _errors = []
        if _warnings is None:
            _warnings = []
        
        # Get provider
        provider = preferred_provider if preferred_provider else self.get_available_provider(task_type)
        
        if not provider:
            if _errors:
                error_summary = " | ".join(_errors)
                return {"error": f"All providers failed: {error_summary}", "provider": None, "model": None}
            return {
                "error": "No AI providers configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, or install Ollama.",
                "provider": None,
                "model": None
            }
        
        _tried_providers.add(provider)
        model = model_override if model_override else self.models[provider]
        
        try:
            if provider == ModelProvider.ANTHROPIC:
                result = await self._chat_anthropic(messages, model, tools, max_tokens, temperature)
            elif provider == ModelProvider.OPENAI:
                result = await self._chat_openai(messages, model, tools, max_tokens, temperature)
            elif provider == ModelProvider.GOOGLE:
                result = await self._chat_google(messages, model, tools, max_tokens, temperature)
            elif provider == ModelProvider.OLLAMA:
                result = await self._chat_ollama(messages, model, max_tokens, temperature)
            elif provider == ModelProvider.GROQ:
                result = await self._chat_groq(messages, model, tools, max_tokens, temperature)
            else:
                return {"error": f"Unknown provider: {provider}", "provider": None, "model": model}

            # If a provider returns empty content with no tool calls and no error,
            # treat it as a soft failure and try the next provider automatically.
            # This catches silent failures (e.g. Groq returning None content unexpectedly).
            if not result.get("content") and not result.get("tool_calls") and not result.get("error"):
                error_msg = f"{provider.value}: empty response (no content, no tool calls)"
                _errors.append(error_msg)
                print(f"[WARN] {error_msg} — trying next provider")
                fallback_providers = [p for p in self.routing_strategy[task_type] if p not in _tried_providers and self.is_provider_available(p)]
                if fallback_providers:
                    print(f"[FALLBACK] {provider.value} gave empty response → trying {fallback_providers[0].value}")
                    return await self.chat(messages, task_type, tools, max_tokens, temperature, preferred_provider=fallback_providers[0], _tried_providers=_tried_providers, _errors=_errors, _warnings=_warnings)
                # All providers exhausted — return result as-is (caller has its own fallback message)

            # Append any billing/credit warnings to the response content so user sees them
            if _warnings and result.get("content") and not result.get("error"):
                warning_block = "\n\n---\n" + "\n".join(f"⚠️ {w}" for w in _warnings)
                result["content"] = result["content"] + warning_block
                result["provider_warnings"] = _warnings

            return result
        except Exception as e:
            # Collect error and fallback to next provider (excluding ALL previously tried ones)
            error_msg = f"{provider.value}: {str(e)[:200]}"
            _errors.append(error_msg)
            print(f"[ERR] {error_msg}")

            # Detect billing/credit errors and queue a user-visible warning
            err_lower = str(e).lower()
            BILLING_KEYWORDS = (
                "credit", "billing", "payment", "quota", "insufficient_quota",
                "credit_balance", "overloaded", "rate_limit", "too_many_requests"
            )
            if any(kw in err_lower for kw in BILLING_KEYWORDS):
                provider_names = {
                    "anthropic": "Anthropic (Claude)",
                    "openai": "OpenAI",
                    "google": "Google (Gemini)",
                    "groq": "Groq",
                    "ollama": "Ollama",
                }
                friendly = provider_names.get(provider.value, provider.value)
                if "credit" in err_lower or "billing" in err_lower or "payment" in err_lower or "insufficient" in err_lower:
                    _warnings.append(f"{friendly} is out of credits — switched providers. Add credits at your provider dashboard to restore it.")
                elif "overloaded" in err_lower:
                    _warnings.append(f"{friendly} is currently overloaded — switched providers temporarily.")
                elif "rate_limit" in err_lower or "too_many" in err_lower:
                    _warnings.append(f"{friendly} hit its rate limit — switched providers temporarily.")

            fallback_providers = [p for p in self.routing_strategy[task_type] if p not in _tried_providers and self.is_provider_available(p)]
            if fallback_providers:
                print(f"[FALLBACK] Falling back to {fallback_providers[0].value}")
                return await self.chat(messages, task_type, tools, max_tokens, temperature, preferred_provider=fallback_providers[0], _tried_providers=_tried_providers, _errors=_errors, _warnings=_warnings)
            error_summary = " | ".join(_errors)
            return {"error": f"All providers failed: {error_summary}", "provider": provider.value, "model": model}
    
    async def _chat_anthropic(self, messages, model, tools, max_tokens, temperature):
        """Chat with Anthropic Claude"""
        # Convert messages to Claude format
        system_msg = next((m["content"] for m in messages if m["role"] == "system"), None)
        
        # Prepare messages, converting OpenAI-style image content to Anthropic format if needed
        claude_messages = []
        for m in messages:
            if m["role"] != "system":
                content = m["content"]
                if isinstance(content, list):
                    new_content = []
                    for item in content:
                        if isinstance(item, dict) and item.get("type") == "image_url":
                            url = item["image_url"]["url"]
                            if url.startswith("data:"):
                                # Convert data URI to Anthropic source
                                try:
                                    header, data = url.split(",", 1)
                                    media_type = header.split(":")[1].split(";")[0]
                                    new_content.append({
                                        "type": "image", 
                                        "source": {
                                            "type": "base64", 
                                            "media_type": media_type, 
                                            "data": data
                                        }
                                    })
                                except:
                                    pass # Skip malformed
                        else:
                            new_content.append(item)
                    content = new_content
                
                claude_messages.append({"role": m["role"], "content": content})
        
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
        
        response = await self.anthropic_client.messages.create(**kwargs)
        
        # Extract content (join all text blocks)
        content_text = ""
        if hasattr(response, "content") and response.content:
            text_blocks = [c.text for c in response.content if hasattr(c, "type") and c.type == "text"]
            content_text = "\n".join(text_blocks)
        
        # Extract tool calls safely
        tool_calls = []
        if hasattr(response, "content") and response.content:
            for c in response.content:
                if hasattr(c, "type") and c.type == "tool_use":
                    tool_calls.append({
                        "id": getattr(c, "id", None),
                        "name": getattr(c, "name", None),
                        "input": getattr(c, "input", {})
                    })
        
        return {
            "content": content_text,
            "provider": ModelProvider.ANTHROPIC.value,
            "model": model,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens
            },
            "tool_calls": tool_calls
        }
    
    async def _chat_openai(self, messages, model, tools, max_tokens, temperature):
        """Chat with OpenAI GPT"""
        # o1/o3 and gpt-5.x (reasoning) models use max_completion_tokens, not max_tokens.
        # They also don't support temperature, frequency_penalty, or presence_penalty.
        is_reasoning = model.startswith(("o1", "o3", "o4", "gpt-5"))
        tokens_key = "max_completion_tokens" if is_reasoning else "max_tokens"
        kwargs = {
            "model": model,
            "messages": messages,
            tokens_key: max_tokens,
        }
        if not is_reasoning:
            kwargs["temperature"] = temperature
            kwargs["frequency_penalty"] = 0.5
            kwargs["presence_penalty"] = 0.5
        
        if tools:
            # Convert Claude tools to OpenAI format
            openai_tools = [self._convert_tool_to_openai(tool) for tool in tools]
            kwargs["tools"] = openai_tools
        
        response = await self.openai_client.chat.completions.create(**kwargs)
        
        tool_calls = []
        raw_tool_calls = response.choices[0].message.tool_calls or []
        for tc in raw_tool_calls:
            args = getattr(tc.function, "arguments", "")
            try:
                parsed_args = json.loads(args) if isinstance(args, str) else (args or {})
            except Exception:
                parsed_args = {"raw": args}
            tool_calls.append({
                "id": getattr(tc, "id", None),
                "name": getattr(tc.function, "name", None),
                "input": parsed_args
            })
        
        return {
            "content": response.choices[0].message.content or "",
            "provider": ModelProvider.OPENAI.value,
            "model": model,
            "usage": {
                "input_tokens": response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens
            },
            "tool_calls": tool_calls
        }
    
    async def _chat_google(self, messages, model, tools, max_tokens, temperature):
        """Chat with Google Gemini using new google-genai SDK with full function calling support."""
        # Extract system message for system_instruction
        system_msg = None
        contents = []
        for msg in messages:
            if msg["role"] == "system":
                system_msg = msg["content"] if isinstance(msg["content"], str) else str(msg["content"])
                continue
            role = "user" if msg["role"] == "user" else "model"
            # Handle list content (tool results / multimodal) — flatten to text
            raw = msg["content"]
            if isinstance(raw, list):
                parts = []
                for item in raw:
                    if isinstance(item, dict):
                        if item.get("type") == "text":
                            parts.append({"text": item.get("text", "")})
                        elif item.get("type") in ("tool_use", "tool_result"):
                            # Represent tool interaction as text so Gemini understands context
                            parts.append({"text": json.dumps(item)})
                        else:
                            parts.append({"text": json.dumps(item)})
                    else:
                        parts.append({"text": str(item)})
                contents.append({"role": role, "parts": parts})
            else:
                contents.append({"role": role, "parts": [{"text": str(raw)}]})

        # Add function declarations if tools are provided (before building config)
        _google_tool_list = None
        if tools:
            def _sanitize_schema(s):
                """Recursively ensure every object-type node has a 'properties' key.
                Gemini's SDK raises ValueError on any object without properties."""
                if not isinstance(s, dict):
                    return s
                s = dict(s)
                if s.get("type") == "object" and "properties" not in s:
                    s["properties"] = {}
                if "properties" in s:
                    s["properties"] = {k: _sanitize_schema(v) for k, v in s["properties"].items()}
                if "items" in s:
                    s["items"] = _sanitize_schema(s["items"])
                return s

            try:
                from google.genai import types as _gtypes
                func_decls = []
                google_tools_failed = []
                for tool in tools:
                    try:
                        schema = _sanitize_schema(dict(tool.get("input_schema", {})))
                        func_decls.append(_gtypes.FunctionDeclaration(
                            name=tool["name"],
                            description=tool.get("description", ""),
                            parameters=schema,
                        ))
                    except Exception as _te_single:
                        google_tools_failed.append(f"{tool['name']}: {_te_single}")
                if google_tools_failed:
                    print(f"[WARN] Google tool decl failed for {len(google_tools_failed)} tool(s): {google_tools_failed[:3]}")
                if func_decls:
                    _google_tool_list = [_gtypes.Tool(function_declarations=func_decls)]
                    print(f"[OK] Google tools loaded: {len(func_decls)} ({len(google_tools_failed)} skipped)")
            except Exception as _te:
                print(f"[WARN] Google tool setup failed entirely: {_te}")

        # Build typed GenerateContentConfig — raw dict does not reliably serialize Tool objects
        try:
            from google.genai import types as _gtypes
            _config_kwargs = {"max_output_tokens": max_tokens, "temperature": temperature}
            if system_msg:
                _config_kwargs["system_instruction"] = system_msg
            if _google_tool_list:
                _config_kwargs["tools"] = _google_tool_list
                _config_kwargs["tool_config"] = _gtypes.ToolConfig(
                    function_calling_config=_gtypes.FunctionCallingConfig(mode="AUTO")
                )
            config = _gtypes.GenerateContentConfig(**_config_kwargs)
        except Exception as _cfg_err:
            # Fallback: plain dict (older SDK)
            print(f"[WARN] GenerateContentConfig failed, falling back to dict: {_cfg_err}")
            config = {"max_output_tokens": max_tokens, "temperature": temperature}
            if system_msg:
                config["system_instruction"] = system_msg
            if _google_tool_list:
                config["tools"] = _google_tool_list

        import asyncio as _asyncio
        response = await _asyncio.to_thread(
            self.google_client.models.generate_content,
            model=model,
            contents=contents,
            config=config
        )

        # Extract text content safely
        content_text = ""
        try:
            content_text = response.text or ""
        except Exception:
            # response.text raises if there are only function calls or safety blocks
            pass

        # Extract function calls if any
        tool_calls = []
        try:
            for candidate in (response.candidates or []):
                for part in (candidate.content.parts if candidate.content else []):
                    if hasattr(part, "function_call") and part.function_call:
                        fc = part.function_call
                        tool_calls.append({
                            "id": f"google-{fc.name}-{len(tool_calls)}",
                            "name": fc.name,
                            "input": dict(fc.args) if fc.args else {},
                        })
        except Exception as _tce:
            print(f"[WARN] Google tool call extraction failed: {_tce}")

        usage_in = 0
        usage_out = 0
        try:
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                usage_in = response.usage_metadata.prompt_token_count or 0
                usage_out = response.usage_metadata.candidates_token_count or 0
        except Exception:
            pass

        return {
            "content": content_text,
            "provider": ModelProvider.GOOGLE.value,
            "model": model,
            "usage": {"input_tokens": usage_in, "output_tokens": usage_out},
            "tool_calls": tool_calls,
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
            "tool_calls": []  # Ollama doesn't support function calling
        }
    
    async def _chat_groq(self, messages, model, tools, max_tokens, temperature):
        """Chat with Groq (free tier: 14,400 req/day, Llama 3.3 70B)"""
        kwargs = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        if tools:
            # Groq uses OpenAI-compatible tool format
            kwargs["tools"] = [self._convert_tool_to_openai(t) for t in tools]
            kwargs["tool_choice"] = "auto"

        response = await self.groq_client.chat.completions.create(**kwargs)
        choice = response.choices[0]

        # Extract tool calls
        tool_calls = []
        raw_tcs = getattr(choice.message, "tool_calls", None) or []
        for tc in raw_tcs:
            args = getattr(tc.function, "arguments", "")
            try:
                parsed = json.loads(args) if isinstance(args, str) else (args or {})
            except Exception:
                parsed = {"raw": args}
            tool_calls.append({
                "id": getattr(tc, "id", None),
                "name": tc.function.name,
                "input": parsed,
            })

        return {
            "content": choice.message.content or "",
            "provider": ModelProvider.GROQ.value,
            "model": model,
            "usage": {
                "input_tokens": response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens,
            },
            "tool_calls": tool_calls,
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
    
    def reconfigure_providers(self):
        """Re-read env vars and reinitialize provider clients.
        Call this after injecting new API keys into os.environ at runtime."""
        if ANTHROPIC_AVAILABLE:
            anthropic_key = os.getenv("ANTHROPIC_API_KEY")
            if anthropic_key and not self.anthropic_client:
                self.anthropic_client = anthropic.AsyncAnthropic(api_key=anthropic_key)
                print("[OK] Anthropic reconfigured")
        if OPENAI_AVAILABLE:
            openai_key = os.getenv("OPENAI_API_KEY")
            if openai_key and not self.openai_client:
                self.openai_client = AsyncOpenAI(api_key=openai_key)
                print("[OK] OpenAI reconfigured")
        if GOOGLE_AVAILABLE:
            google_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
            if google_key and not self.google_client:
                self.google_client = genai.Client(api_key=google_key)
                print("[OK] Google Gemini reconfigured")
        if GROQ_AVAILABLE:
            groq_key = os.getenv("GROQ_API_KEY")
            if groq_key and not self.groq_client:
                self.groq_client = AsyncGroq(api_key=groq_key)
                print("[OK] Groq reconfigured")
        self._setup_routing_strategy()

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
