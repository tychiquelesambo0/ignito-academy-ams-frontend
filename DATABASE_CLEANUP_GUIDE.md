# Database Cleanup Guide

## ⚠️ IMPORTANT: Is Your Database Clean?

Before running migrations, you MUST ensure your Supabase database is clean (no legacy tables from previous projects).

---

## Step 1: Check Database Status

### Option A: Quick Check via Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Database** → **Tables**
4. Look at the tables list:
   - **If EMPTY** → ✅ Database is clean, proceed to migrations
   - **If you see tables** → ⚠️ Database has legacy data, needs cleanup

### Option B: Check via CLI Script

```bash
./check-database.sh
```

This will:
- Connect to your database
- List all existing tables
- Count tables in public schema
- Show storage buckets
- Recommend next steps

---

## Step 2: Choose Your Path

### Path A: Database is Clean ✅

**If you created a BRAND NEW Supabase project:**

1. Skip the cleanup migration
2. Proceed directly to run migrations:
   ```bash
   ./run-migrations.sh
   ```

**What will happen:**
- Fresh tables created from scratch
- No conflicts
- Clean implementation of four architectural pillars

---

### Path B: Database Has Legacy Data ⚠️

**If you're reusing an existing Supabase project with old tables:**

You have **2 options**:

#### Option 1: Create a Brand New Project (RECOMMENDED)

**Why this is better:**
- ✅ No risk of data conflicts
- ✅ Clean slate for new architecture
- ✅ No legacy constraints interfering
- ✅ Easier to manage

**Steps:**
1. Go to Supabase Dashboard
2. Create a **new project** (different name)
3. Update `.env.local` with new project credentials
4. Run migrations on the new project

#### Option 2: Clean the Existing Database (DESTRUCTIVE)

**⚠️ WARNING: This will DELETE ALL existing data**

**Steps:**

1. **Backup your data first** (if you need it):
   ```bash
   # Export existing data
   supabase db dump -f backup.sql
   ```

2. **Run the cleanup migration**:
   
   Go to Supabase Dashboard → **SQL Editor** and run:
   
   ```sql
   -- WARNING: This deletes ALL data
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   GRANT ALL ON SCHEMA public TO anon;
   GRANT ALL ON SCHEMA public TO authenticated;
   GRANT ALL ON SCHEMA public TO service_role;
   ```

3. **Verify cleanup**:
   ```bash
   ./check-database.sh
   ```
   
   Should show: "✅ Database is CLEAN - No tables found"

4. **Run fresh migrations**:
   ```bash
   ./run-migrations.sh
   ```

---

## Step 3: Verify Clean State

After cleanup (if needed), verify:

```bash
./check-database.sh
```

**Expected output:**
```
✅ Database is CLEAN - No tables found in public schema
✅ Safe to proceed with migrations
```

---

## Common Legacy Tables to Watch For

If you see these tables, they're from the old project:

- `applicants`
- `applications`
- `admissions_officers`
- `uploaded_documents`
- `email_logs`
- `webhook_logs`
- `audit_trail`
- `applicant_id_sequences`

**These MUST be dropped before running new migrations.**

---

## Why a Clean Database Matters

### Problems with Legacy Data:

1. **Schema Conflicts**
   - Old tables may have different column types
   - Constraints may conflict with new architecture

2. **Architectural Violations**
   - Old schema may not enforce USD single-currency
   - May have video file upload logic (not URLs)
   - May have manual password hashing (not Supabase Auth)

3. **Data Integrity Issues**
   - Old data may not meet new validation rules
   - Foreign key relationships may break

### Benefits of Clean Database:

1. ✅ **Four Pillars Enforced from Day 1**
   - USD single-currency constraints
   - No prohibited keywords
   - Supabase Auth only
   - Video URLs only

2. ✅ **No Migration Conflicts**
   - Fresh schema applies cleanly
   - No constraint violations

3. ✅ **Predictable Behavior**
   - Exactly matches design document
   - All property tests will pass

---

## Recommended Approach

### For Production:

**Always use a BRAND NEW Supabase project**

- Create: `ignito-academy-ams-production`
- Region: Europe (Frankfurt or London)
- Fresh database, no legacy data

### For Development:

**Option 1: New Project (Best)**
- Create: `ignito-academy-ams-dev`
- Clean slate for testing

**Option 2: Clean Existing (Acceptable)**
- Only if you don't need old data
- Run cleanup script
- Verify clean state

---

## Troubleshooting

### Issue: "Table already exists"

**Cause**: Database not clean

**Solution**:
1. Run cleanup script
2. Verify with `./check-database.sh`
3. Re-run migrations

### Issue: "Constraint violation"

**Cause**: Legacy data doesn't meet new constraints

**Solution**:
1. Drop all tables
2. Start fresh
3. Or create new project

### Issue: "RLS policy already exists"

**Cause**: Old RLS policies still present

**Solution**:
```sql
-- Drop all RLS policies
DO $$ 
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname 
           FROM pg_policies 
           WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                   r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;
```

---

## Quick Decision Tree

```
Is this a BRAND NEW Supabase project?
│
├─ YES → ✅ Proceed with migrations
│         ./run-migrations.sh
│
└─ NO → Do you need the old data?
        │
        ├─ YES → Create NEW project (recommended)
        │        Update .env.local
        │        Run migrations on new project
        │
        └─ NO → Clean existing database
                 Run cleanup script
                 Verify clean state
                 Run migrations
```

---

## Next Steps

Once database is confirmed clean:

1. ✅ Run `./check-database.sh` → Should show "Database is CLEAN"
2. ✅ Run `./run-migrations.sh` → Applies all 4 migrations
3. ✅ Verify tables created
4. ✅ Create test admin user
5. ✅ Proceed to Task 3 (Authentication Setup)

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-10  
**Status**: Ready for Use
