# Quick Start: Brand New Supabase Project

## 🚀 Fast Track Setup (30 minutes)

Follow these steps to get your brand new Supabase project up and running.

---

## Step 1: Create Supabase Project (5 minutes)

1. **Go to**: https://supabase.com/dashboard
2. **Click**: "New project"
3. **Fill in**:
   - Name: `ignito-academy-ams`
   - Password: Click 🎲 to generate → **SAVE IT!**
   - Region: **Europe (Frankfurt)** or **Europe (London)**
   - Plan: **Free**
4. **Click**: "Create new project"
5. **Wait**: 2-3 minutes

---

## Step 2: Get Your Credentials (2 minutes)

### In Supabase Dashboard:

**Settings → General:**
- Copy **Reference ID** → Save it

**Settings → API:**
- Copy **Project URL**
- Copy **anon public** key
- Copy **service_role** key

---

## Step 3: Configure Environment (1 minute)

Run this in your terminal:

```bash
cd "/Users/cash/Admitta AMS/ignito-academy-ams-frontend-main"
./setup-env.sh
```

**Paste when prompted:**
- Project URL
- Anon key
- Service role key
- Database password

✅ `.env.local` created!

---

## Step 4: Enable Extensions (1 minute)

**In Supabase Dashboard → Database → Extensions:**

1. Enable `pgcrypto`
2. Enable `pg_stat_statements`

---

## Step 5: Run Migrations (5 minutes)

```bash
./run-migrations.sh
```

**When prompted:**
- Enter your **Project Reference**
- Enter your **Database Password**
- Confirm: `y` to push migrations

✅ Database created!

---

## Step 6: Create Admin User (3 minutes)

**In Supabase Dashboard → Authentication → Users:**

1. Click **"Add user"**
2. Email: `admin@ignitoacademy.com`
3. Generate password → **SAVE IT!**
4. Check ✅ **"Auto Confirm User"**
5. Click **"Create user"**
6. **Copy the UUID**

**In SQL Editor:**

```sql
UPDATE admissions_officers
SET id = 'PASTE_UUID_HERE'
WHERE email = 'admin@ignitoacademy.com';
```

✅ Admin ready!

---

## Step 7: Verify Setup (2 minutes)

**Check Tables (Database → Tables):**
- Should see 9 tables ✅

**Check Storage (Storage):**
- Should see 2 buckets ✅
- NO video bucket ✅

**Test Function (SQL Editor):**
```sql
SELECT generate_applicant_id(2026);
-- Should return: IGN-2026-00001
```

---

## ✅ You're Done!

**Your brand new Supabase project is ready!**

### What You Have:
- ✅ Clean database with 9 tables
- ✅ USD single-currency enforced
- ✅ Video URL validation (no file uploads)
- ✅ Supabase Auth configured
- ✅ RLS policies enabled
- ✅ Storage buckets created
- ✅ Test admin user ready

### Next Steps:
- **Task 3**: Authentication Setup
- **Task 4**: Payment Provider Interface
- **Task 5**: Mock Payment Provider

---

## 🆘 Need Help?

**Detailed guides:**
- `NEW_PROJECT_CHECKLIST.md` - Complete checklist
- `MIGRATION_GUIDE.md` - Migration details
- `DATABASE_CLEANUP_GUIDE.md` - Troubleshooting

**Quick checks:**
```bash
# Check database status
./check-database.sh

# Verify environment
cat .env.local | grep SUPABASE_URL

# Check migrations
supabase migration list
```

---

**Estimated Total Time**: 30-45 minutes  
**Status**: Ready to Execute
