# Database Migration Guide

## Overview

This guide walks you through linking your local Supabase CLI to your remote project and running the fresh database migrations.

---

## Prerequisites

- ✅ Supabase project created (Task 2.1 complete)
- ✅ `.env.local` configured with Supabase credentials
- ✅ Supabase CLI installed (v2.75.0)

---

## Step 1: Link Supabase CLI to Remote Project

### 1.1 Get Your Project Reference

1. Go to your Supabase Dashboard
2. Navigate to **Project Settings** → **General**
3. Copy your **Project Reference** (e.g., `abcdefghijklmnop`)

### 1.2 Link the Project

Run the following command:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

**Example:**
```bash
supabase link --project-ref abcdefghijklmnop
```

You'll be prompted for your database password (the one you created in Task 2.1).

### 1.3 Verify Link

```bash
supabase status
```

You should see your project details.

---

## Step 2: Review Migration Files

We've created 4 fresh migration files:

1. **`20260410000001_fresh_ams_schema.sql`**
   - Creates all tables with USD single-currency enforcement
   - Implements scholarship system
   - Enforces video URL validation (no file uploads)
   - Database functions and triggers

2. **`20260410000002_rls_policies.sql`**
   - Row Level Security policies for all tables
   - CRITICAL: Document upload policy requires payment_status = 'Confirmed' or 'Waived'

3. **`20260410000003_storage_buckets.sql`**
   - Creates `pieces_justificatives` bucket (PDFs, images ONLY)
   - Creates `official_letters` bucket (PDFs only)
   - NO video bucket (YouTube/Vimeo URLs only)

4. **`20260410000004_seed_data.sql`**
   - Seeds intake year sequences (2024-2027)
   - Creates placeholder test admin account

---

## Step 3: Run Migrations

### Option A: Push All Migrations to Remote (Recommended)

```bash
supabase db push
```

This will:
- Apply all pending migrations to your remote database
- Show you a diff of changes before applying
- Ask for confirmation

### Option B: Run Migrations Individually (For Testing)

```bash
# Apply specific migration
supabase migration up --db-url "postgresql://postgres:[PASSWORD]@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"
```

---

## Step 4: Verify Migrations

### 4.1 Check Tables Created

```bash
supabase db diff
```

Or connect to your database:

```bash
psql "postgresql://postgres:[PASSWORD]@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"
```

Then run:

```sql
-- List all tables
\dt

-- Verify specific table
\d applications

-- Check RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check storage buckets
SELECT * FROM storage.buckets;
```

### 4.2 Verify Constraints

```sql
-- Check USD currency constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'applications'::regclass 
AND conname LIKE '%currency%';

-- Check video URL constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'applications'::regclass 
AND conname LIKE '%video%';
```

---

## Step 5: Create Test Admin User

### 5.1 Via Supabase Dashboard

1. Go to **Authentication** → **Users**
2. Click **"Add user"**
3. Fill in:
   - **Email**: `admin@ignitoacademy.com`
   - **Password**: Generate strong password (save it!)
   - **Auto Confirm User**: ✅ Check this
4. Click **"Create user"**
5. Copy the **User UUID**

### 5.2 Update Admin Record

Run this SQL in your Supabase SQL Editor:

```sql
-- Replace 'PASTE_UUID_HERE' with the actual UUID from step 5.1
UPDATE admissions_officers
SET id = 'PASTE_UUID_HERE'
WHERE email = 'admin@ignitoacademy.com';
```

### 5.3 Verify Admin Login

Try logging in at your app:
- Email: `admin@ignitoacademy.com`
- Password: (the one you created)

---

## Step 6: Test Database Functions

### 6.1 Test Applicant ID Generation

```sql
SELECT generate_applicant_id(2026);
-- Expected: IGN-2026-00001

SELECT generate_applicant_id(2026);
-- Expected: IGN-2026-00002
```

### 6.2 Test Optimistic Locking

```sql
-- This requires an existing application
-- Will be tested during integration tests
```

---

## Troubleshooting

### Issue: "Migration already applied"

**Solution**: The migration has already run. Check with:
```bash
supabase migration list
```

### Issue: "Permission denied"

**Solution**: Ensure you're using the correct database password.

### Issue: "Bucket already exists"

**Solution**: This is fine. The migration uses `ON CONFLICT` to handle existing buckets.

### Issue: "RLS policy already exists"

**Solution**: Drop existing policies first:
```sql
DROP POLICY IF EXISTS "policy_name" ON table_name;
```

Then re-run the migration.

### Issue: "Cannot link project"

**Solution**:
1. Verify project reference is correct
2. Ensure you have owner/admin access to the project
3. Try: `supabase link --project-ref YOUR_REF --password YOUR_PASSWORD`

---

## Rollback Strategy

If you need to rollback:

### Option 1: Drop All Tables (DESTRUCTIVE)

```sql
-- WARNING: This deletes ALL data
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### Option 2: Revert Specific Migration

```bash
supabase migration repair --status reverted 20260410000001
```

---

## Next Steps

After successful migration:

- ✅ Task 2.5: Run migrations ✅ COMPLETE
- ✅ Task 2.6: Enable RLS ✅ COMPLETE
- ✅ Task 2.7: Create RLS policies ✅ COMPLETE
- ✅ Task 2.8: Create storage buckets ✅ COMPLETE
- ✅ Task 2.9: Configure storage RLS ✅ COMPLETE
- ✅ Task 2.10: Seed initial data ✅ COMPLETE

**Ready for Task 3: Authentication Setup!**

---

## Verification Checklist

- [ ] Supabase CLI linked to remote project
- [ ] All 4 migrations applied successfully
- [ ] All tables created (9 tables)
- [ ] RLS enabled on all tables
- [ ] Storage buckets created (2 buckets, NO video bucket)
- [ ] Test admin user created in Supabase Auth
- [ ] Admin record updated with correct UUID
- [ ] Can generate Applicant IDs
- [ ] USD currency constraints enforced
- [ ] Video URL validation working

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-10  
**Status**: Ready for Execution
