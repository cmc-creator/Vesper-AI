# AI Provider Keys Setup Guide

## 🧠 Multi-Model AI - Cost Savings & Flexibility

Vesper now supports **4 AI providers** with automatic routing and fallback:

| Provider | Cost | Speed | Best For |
|----------|------|-------|----------|
| **Google Gemini** | 🟢 FREE (60 req/min) | ⚡ Fast | General chat, cost savings |
| **Anthropic Claude** | 🟡 $3/$15 per 1M tokens | 🚀 Fast | Code, reasoning, current |
| **OpenAI GPT-4** | 🟡 $5/$15 per 1M tokens | ⚡ Fast | Ecosystem, vision |
| **Ollama** | 🟢 100% FREE (local) | 🐢 Slower | Privacy, offline, unlimited |

**Current:** Only Claude configured (working ✅)  
**Savings:** Add Gemini for **90% cost reduction** on casual chat!

---

## 🚀 Quick Setup

### Option 1: Add to Railway (Recommended)

1. **Go to Railway Dashboard:**
   ```
   https://railway.app/project/[your-project]
   ```

2. **Click your backend service → Variables tab**

3. **Add these (any combination works):**
   
   ```env
   # Already have (working):
   ANTHROPIC_API_KEY=sk-ant-api03-...
   
   # Add for FREE tier (60 req/min):
   GOOGLE_API_KEY=AIzaSy...
   
   # Add for GPT ecosystem:
   OPENAI_API_KEY=sk-proj-...
   ```

4. **Railway auto-restarts** - no manual deploy needed!

### Option 2: Local Development

Edit `.env` file in backend folder:
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
GOOGLE_API_KEY=AIzaSy...
OPENAI_API_KEY=sk-proj-...
```

---

## 🔑 How to Get API Keys

### Google Gemini (FREE! 60 requests/min)

1. Go to: https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Copy the key (starts with `AIzaSy...`)
4. Add to Railway: `GOOGLE_API_KEY=AIzaSy...`

**Why add this?**
- Completely FREE for 60 requests per minute
- Great for casual conversation
- 90% cost savings vs Claude/GPT
- Vesper auto-routes simple queries here

### OpenAI GPT-4

1. Go to: https://platform.openai.com/api-keys
2. Click "+ Create new secret key"
3. Name it "Vesper AI"
4. Copy the key (starts with `sk-proj-...`)
5. Add to Railway: `OPENAI_API_KEY=sk-proj-...`

**Why add this?**
- Strong ecosystem (plugins, vision, etc)
- Good for multimodal tasks
- Competitive pricing

### Ollama (100% FREE, Runs Locally)

1. Download: https://ollama.ai
2. Install (double-click installer)
3. Run: `ollama pull llama3.1:70b`
4. Add to .env: `OLLAMA_BASE_URL=http://localhost:11434`

**Why use this?**
- Completely FREE, unlimited usage
- Runs on your machine (privacy)
- No API costs ever
- Great for experimentation

---

## 🎯 Smart Routing

Vesper automatically chooses the **best AI for each task:**

```python
# Code tasks → Claude (best at code)
"Write a Python function..." → Claude Sonnet 4.5

# Simple chat → Gemini (FREE tier)
"How are you?" → Google Gemini 1.5 Flash

# Creative tasks → GPT-4
"Write a poem..." → GPT-4

# Fallback chain:
Claude → GPT → Gemini → Ollama
```

### Task Types:
- **CODE**: Programming, debugging, technical → Claude
- **CHAT**: Casual conversation, Q&A → Gemini (FREE!)
- **SEARCH**: Research, web queries → GPT/Gemini
- **ANALYSIS**: Data, reasoning → Claude
- **CREATIVE**: Writing, brainstorming → GPT

---

## 💰 Cost Comparison

**Example: 1 million casual chat messages**

| Setup | Cost | Savings |
|-------|------|---------|
| Only Claude | ~$45 | Baseline |
| Claude + Gemini | ~$5 | **89% cheaper** |
| Claude + Gemini + Ollama | ~$3 | **93% cheaper** |
| Only Ollama | **$0** | **100% free** |

**Recommended Setup for Cost Savings:**
```env
GOOGLE_API_KEY=...      # Primary for chat (FREE 60/min)
ANTHROPIC_API_KEY=...   # Fallback for code/complex
```

This gives you:
- FREE chat for 99% of conversations
- Claude only for complex tasks
- Automatic fallback if limits hit

---

## ✅ Testing

After adding keys, test each provider:

```bash
# Test with PowerShell:
$body = @{
    message = "Test: Which AI am I talking to?"
    thread_id = "test-routing"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://vesper-backend-production-b486.up.railway.app/api/chat" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

Vesper will tell you which AI model responded!

---

## 🔍 Check Which Models Are Active

Check startup logs in Railway:
```
✅ Anthropic Claude configured
✅ Google Gemini configured  
✅ OpenAI GPT-4 configured
⚠️  Ollama not available (install locally)
```

Or check health endpoint:
```bash
curl https://vesper-backend-production-b486.up.railway.app/health
```

---

## 🎉 Benefits of Multi-Model Setup

1. **Cost Savings**: 70-90% cheaper with Gemini free tier
2. **Reliability**: Auto-fallback if one provider is down
3. **Performance**: Each task uses the best model
4. **Flexibility**: Switch providers anytime
5. **Testing**: Compare different AIs for same task

---

## ⚠️ Important Notes

- **At least ONE provider required** - Vesper needs an AI brain!
- **Free tiers exist** - Gemini (60/min), Ollama (unlimited)
- **Keys are secret** - Never commit to Git
- **Railway restarts automatically** after adding keys
- **Test after adding** to verify it works

---

## 🚀 Recommended Next Steps

1. ✅ **Add Gemini** (FREE tier) - Save 90% on costs
2. ⏸️ **GPT optional** - Only if you need OpenAI ecosystem
3. ⏸️ **Ollama optional** - For privacy/offline use

**Current Status:**
- ✅ Claude working (Railway configured)
- ⏸️ Gemini not added (missing GOOGLE_API_KEY)
- ⏸️ GPT not added (missing OPENAI_API_KEY)
- ⏸️ Ollama not installed (local only)

Add Gemini first for instant cost savings! 🎯
