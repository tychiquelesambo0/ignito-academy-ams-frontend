# Apply Migration: USD Single-Currency Enforcement

## Quick Steps (2 minutes)

### 1. Open Supabase SQL Editor

Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new

### 2. Copy the Migration SQL

The migration file is located at:
`supabase/migrations/20260411_usd_only_constraints.sql`

### 3. Paste and Run

1. Copy the entire contents of the migration file
2. Paste into the SQL Editor
3. Click "Run" (or press Cmd+Enter)

### 4. Verify Success

You should see: **"Success. No rows returned"**

---

## Alternative: Use psql Command

If you have `psql` installed and your database connection string:

```bash
# From project root
psql "YOUR_DATABASE_CONNECTION_STRING" < supabase/migrations/20260411_usd_only_constraints.sql
```

---

## What This Migration Does

✅ Enforces payment amount = exactly $29 USD  
✅ Enforces currency = 'USD' only  
✅ Rejects any non-USD payments  
✅ Adds validation triggers  
✅ Adds CHECK constraints  

---

## Need Help?

The migration SQL is safe to run and idempotent (can run multiple times).

If you encounter any errors, share them and I'll help troubleshoot!
