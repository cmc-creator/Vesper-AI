# 🔧 SUPABASE + RAILWAY IPv6 FIX

## The Problem
Railway containers **ONLY support IPv4**. When connecting to Supabase, DNS returns an IPv6 address first, causing "Network is unreachable" errors.

## THE SOLUTION - Use IPv4-Only Connection String

### Step 1: Get Supabase's IPv4 Address
Go to your Supabase Dashboard and look for **one of these options**:

#### Option A: Transaction Mode (Most Reliable)
1. Go to **Settings → Database → Connection String**
2. Look for **"Transaction Mode"** or **"Direct Connection"**
3. This usually has better IPv4 support than Session Pooler
4. Copy that connection string

#### Option B: Get the IPv4 Address Directly
Run this command on your local machine:
```bash
# Get IPv4 address for your Supabase host
nslookup db.maqxeaobrwopedogsdcf.supabase.co

# Or use this:
ping -4 db.maqxeaobrwopedogsdcf.supabase.co
```

Look for the IPv4 address (format: `xxx.xxx.xxx.xxx`)

### Step 2: Update Railway DATABASE_URL

In your **Railway project → Variables**, update `DATABASE_URL` to:

**If you found an IPv4 address** (e.g., `54.123.45.67`):
```
postgresql://postgres:1p8nt9pFqnMSLr5l@54.123.45.67:5432/postgres?sslmode=require
```

**Or use Transaction Mode connection string** from Supabase:
```
postgresql://postgres.maqxeaobrwopedogsdcf:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres
```

### Step 3: Alternative - Use Supavisor Port (Most Reliable)

Supabase has a special IPv4-compatible pooler on **port 6543**:

```
postgresql://postgres:1p8nt9pFqnMSLr5l@db.maqxeaobrwopedogsdcf.supabase.co:6543/postgres?sslmode=require
```

Try port **6543** instead of **5432** - this bypasses the IPv6 DNS issue!

### Step 4: Quick Test

After updating Railway variables:
1. Go to Railway → Your Project → Redeploy
2. Watch the logs for either:
   - ✅ "PostgreSQL connected!"
   - ⚠️ "Using SQLite fallback" (means still not working)

## Why This Happens
- **Railway**: IPv4 only ❌ IPv6
- **Supabase DNS**: Returns IPv6 first ✅ IPv6
- **Result**: Connection fails

## Current Workaround
Your backend now uses **SQLite fallback** automatically, so Vesper works even without Supabase. But you want PostgreSQL for persistence.

## Need Help?
1. Share your Supabase connection strings (hide password)
2. Try the **port 6543** option first (easiest)
3. Or switch to Transaction Mode instead of Session Pooler
