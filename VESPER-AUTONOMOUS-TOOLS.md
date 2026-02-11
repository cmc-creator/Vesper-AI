# Vesper's Autonomous Tools Guide

## Overview
Vesper now has full autonomous capabilities with **human approval gates** for safety.

## Tool Categories

### 🟢 Safe (Read-Only) - No Approval Needed
These tools are always safe to use:

**Git:**
- `git_status` - Check what files changed, current branch
- `git_diff` - See detailed file changes

**Vercel:**
- `vercel_deployments` - View recent frontend deployments

**Railway:**
- `railway_logs` - View backend logs

**GitHub:**
- `github_search_issues` - Search repository issues

### 🟡 Dangerous (Write Operations) - Approval Required
These tools require human confirmation:

**Git:**
- `git_commit` - Stage and commit changes
- `git_push` - Push to GitHub (triggers auto-deploy)

**Vercel:**
- `vercel_deploy` - Trigger frontend redeploy
- `vercel_set_env` - Change environment variables

**Railway:**
- `railway_restart` - Restart backend service

**GitHub:**
- `github_create_issue` - Create new issue

## How Approval Works

### 1. Vesper Proposes Action
When Vesper wants to do something dangerous:

```
User: "commit these changes"
Vesper: "I'll commit the changes with message 'fix: update search'. 
         This requires approval. Approval ID: a1b2c3d4
         
         To approve, say: 'approve a1b2c3d4'
         To deny, say: 'deny a1b2c3d4'"
```

### 2. Human Approves or Denies
```
User: "approve a1b2c3d4"
Vesper: ✅ "Action approved! Executing git commit..."
        [commits code]
        "Done! Committed 3 files with message 'fix: update search'"
```

OR

```
User: "deny a1b2c3d4"
Vesper: ❌ "Action denied. I won't commit those changes."
```

### 3. Approval Expires
Pending approvals are stored in memory and cleared on server restart.

## Example Workflows

### Workflow 1: Fix Bug and Deploy
```
User: "there's a typo in the search function"
Vesper: [uses read_file to find typo]
        [uses write_file to fix it]
        [uses git_status to see change]
        [uses git_diff to verify fix]
        "Fixed the typo. Want me to commit and push?"

User: "yes"
Vesper: [uses git_commit, gets approval request]
        "I'll commit with message 'fix: typo in search function'
         Approval ID: x7y8z9"

User: "approve x7y8z9"
Vesper: ✅ [commits]
        [uses git_push, gets approval request]
        "Ready to push to GitHub (will trigger auto-deploy)
         Approval ID: p4q5r6"

User: "approve p4q5r6"
Vesper: ✅ [pushes]
        "Pushed to GitHub! Railway will redeploy in ~2min."
```

### Workflow 2: Create GitHub Issue
```
User: "create an issue about adding dark mode"
Vesper: [uses github_create_issue]
        "I'll create issue: 'Add dark mode support'
         Body: 'Users have requested dark mode...'
         Labels: ['enhancement', 'ui']
         
         Approval ID: m3n4o5"

User: "approve m3n4o5"
Vesper: ✅ "Issue created! #47: https://github.com/cmc-creator/Vesper-AI/issues/47"
```

### Workflow 3: Emergency Restart
```
User: "backend is timing out, restart it"
Vesper: [uses railway_logs to check]
        "Logs show memory spike. I'll restart Railway.
         Approval ID: k1l2m3"

User: "approve k1l2m3"
Vesper: ✅ "Railway restarting... Service will be back in ~30s"
```

## Setup Required

### Get API Tokens
Add these to your `.env` file:

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...           # Already configured ✅

# For autonomous tools:
VERCEL_TOKEN=...                        # From vercel.com/account/tokens
GITHUB_TOKEN=...                        # From github.com/settings/tokens
RAILWAY_TOKEN=...                       # From railway.app/account/tokens
RAILWAY_PROJECT_ID=...                  # From Railway project settings
RAILWAY_SERVICE_ID=...                  # From Railway service settings
```

### Vercel Token
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: "Vesper Autonomous Access"
4. Scope: Full Access
5. Copy token to `.env`

### GitHub Token
1. Go to https://github.com/settings/tokens/new
2. Check: `repo`, `workflow`, `write:packages`
3. Generate token
4. Copy to `.env`

### Railway Token
1. Go to https://railway.app/account/tokens
2. Create new token
3. Copy to `.env`
4. Get project ID and service ID from Railway project URL

## Safety Features

✅ **Approval Required** - All destructive actions need human OK
✅ **Audit Trail** - All actions logged with timestamps
✅ **Approval IDs** - Unique IDs prevent accidental execution
✅ **Read-Only by Default** - Most tools are safe to use anytime
✅ **No Silent Failures** - Clear error messages if something goes wrong

## Testing Tools

### Test Vesper's Tools
```
User: "check git status"
Vesper: [uses git_status]
        "Current branch: main
         Changed files: backend/main.py
         3 files modified, 5 insertions, 2 deletions"

User: "show me what changed"
Vesper: [uses git_diff]
        [shows detailed diff]

User: "what are the recent deployments?"
Vesper: [uses vercel_deployments]
        "Recent deployments:
         1. 2026-02-10 - READY - vesper-ai-delta-abc123.vercel.app
         2. 2026-02-09 - READY - vesper-ai-delta-xyz789.vercel.app"
```

## Current Status

✅ **Web Search** - Working! (ddgs library on Railway)
✅ **File System** - Read/write/list/delete files
✅ **Code Execution** - Run Python sandboxed
✅ **Pattern Analysis** - Analyze feedback/interactions
✅ **Git Tools** - Status, diff, commit, push
✅ **Vercel Tools** - Deployments, deploy, env vars
✅ **Railway Tools** - Logs, restart
✅ **GitHub Tools** - Search, create issues
✅ **Approval System** - Human confirmation for dangerous actions

## Next Steps

Want to enable these? Set the tokens in your `.env` file.

**Without tokens:**
- Read-only tools work (git status, git diff, etc.)
- Write tools will show "API token not set" error
- Vesper will tell you which token is missing

**With tokens:**
- Full autonomous capabilities
- All tools functional
- Vesper can self-manage deployments with approval
