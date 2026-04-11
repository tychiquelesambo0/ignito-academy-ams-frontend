# 🚀 Creating Your Brand New Supabase Project

## Why a Brand New Project?

You asked to create a **brand new Supabase project** to ensure:
- ✅ **Clean slate** - No legacy data or schema conflicts
- ✅ **Four pillars enforced** - USD, no prohibited keywords, Supabase Auth, video URLs
- ✅ **Predictable behavior** - Exactly matches our design document
- ✅ **Easy debugging** - No unexpected legacy constraints

---

## 📚 Documentation I've Created for You

### **Quick Start Guides**

1. **`QUICK_START_NEW_PROJECT.md`** ⚡
   - **Use this for**: Fast 30-minute setup
   - **Best for**: Quick execution, minimal reading

2. **`NEW_PROJECT_CHECKLIST.md`** 📋
   - **Use this for**: Step-by-step verification
   - **Best for**: Ensuring nothing is missed

### **Detailed Guides**

3. **`MIGRATION_GUIDE.md`**
   - Complete migration execution guide
   - Troubleshooting section
   - Verification steps

4. **`DATABASE_CLEANUP_GUIDE.md`**
   - How to check if database is clean
   - Cleanup procedures (if needed)
   - Decision tree for choosing approach

5. **`SUPABASE_SETUP.md`**
   - Original Supabase project creation guide
   - Detailed credential collection steps

### **Automated Scripts**

6. **`setup-env.sh`** 🔧
   - Interactive environment configuration
   - Creates `.env.local` automatically
   - Validates inputs

7. **`run-migrations.sh`** 🚀
   - Links Supabase CLI to project
   - Runs all 4 migrations
   - Verifies success

8. **`check-database.sh`** 🔍
   - Checks if database is clean
   - Lists existing tables
   - Recommends next steps

### **Migration Files**

9. **`20260410000001_fresh_ams_schema.sql`** (600+ lines)
   - Creates 9 tables
   - Enforces USD single-currency
   - Validates video URLs
   - Database functions & triggers

10. **`20260410000002_rls_policies.sql`** (400+ lines)
    - Row Level Security for all tables
    - Document upload requires payment

11. **`20260410000003_storage_buckets.sql`** (200+ lines)
    - 2 storage buckets (NO video bucket)
    - Storage RLS policies

12. **`20260410000004_seed_data.sql`** (100+ lines)
    - Intake year sequences
    - Test admin placeholder

---

## 🎯 Your Next Steps (Choose One Path)

### **Path A: Fast Track (30 minutes)**

```bash
# 1. Open the quick start guide
open QUICK_START_NEW_PROJECT.md

# 2. Follow the 7 steps
# 3. Done!
```

### **Path B: Detailed Checklist (45 minutes)**

```bash
# 1. Open the comprehensive checklist
open NEW_PROJECT_CHECKLIST.md

# 2. Check off each box as you go
# 3. Verify everything works
```

---

## 📋 What Will Happen

### **During Setup:**

1. **Create Supabase Project**
   - Name: `ignito-academy-ams`
   - Region: Europe (Frankfurt or London)
   - Clean, empty database

2. **Configure Environment**
   - Run `./setup-env.sh`
   - Creates `.env.local` with your credentials

3. **Run Migrations**
   - Run `./run-migrations.sh`
   - Creates 9 tables
   - Enables RLS
   - Creates 2 storage buckets

4. **Create Admin User**
   - Via Supabase Dashboard
   - Email: `admin@ignitoacademy.com`
   - Update admin record with UUID

### **After Setup:**

✅ **You'll have:**
- 9 database tables with USD enforcement
- RLS policies protecting all data
- 2 storage buckets (documents and PDFs)
- Test admin user ready
- Video URL validation (no file uploads)
- Supabase Auth configured

✅ **You'll be ready for:**
- Task 3: Authentication Setup
- Task 4: Payment Provider Interface
- Task 5: Mock Payment Provider

---

## 🔒 Four Architectural Pillars Verified

### **1. USD Single-Currency ✅**
```sql
-- Database enforces this
CHECK (payment_currency = 'USD')
CHECK (currency = 'USD')
```

### **2. Keyword Ban ✅**
```sql
-- No prohibited keywords in schema
-- Comments use "UK Level 3 Foundation Diploma"
```

### **3. Supabase Auth ONLY ✅**
```sql
-- All auth via Supabase
applicants.id REFERENCES auth.users(id)
admissions_officers.id REFERENCES auth.users(id)
```

### **4. Video URLs Only ✅**
```sql
-- URL validation, NO file uploads
CHECK (scholarship_video_url ~* '^https?://(www\.)?(youtube\.com|vimeo\.com)')
-- NO video storage bucket created
```

---

## ⏱️ Time Estimates

| Task | Fast Track | Detailed |
|------|-----------|----------|
| Create project | 5 min | 5 min |
| Get credentials | 2 min | 3 min |
| Configure env | 1 min | 2 min |
| Enable extensions | 1 min | 2 min |
| Run migrations | 5 min | 10 min |
| Create admin | 3 min | 5 min |
| Verify setup | 2 min | 10 min |
| **TOTAL** | **~20 min** | **~40 min** |

---

## 🆘 If You Get Stuck

### **Quick Checks:**

```bash
# Check environment configured
cat .env.local | grep SUPABASE_URL

# Check database is clean
./check-database.sh

# Check migrations ready
ls -la supabase/migrations/202604*

# Check Supabase CLI
supabase --version
```

### **Common Issues:**

**"Can't create project"**
- Check Supabase account limits
- Try different project name
- Contact Supabase support

**"Migration failed"**
- Verify database is clean
- Check password is correct
- Review error message

**"Can't link CLI"**
- Verify project reference
- Check you have admin access
- Try with password flag

---

## 📞 Ready to Start?

**Pick your path and begin:**

1. **Fast Track**: Open `QUICK_START_NEW_PROJECT.md`
2. **Detailed**: Open `NEW_PROJECT_CHECKLIST.md`

**When you're done, let me know and I'll help you:**
- Verify everything worked
- Test the database functions
- Move to Task 3 (Authentication Setup)

---

## 🎉 Success Criteria

You'll know you're done when:

- ✅ Supabase project created (Europe region)
- ✅ `.env.local` configured with credentials
- ✅ 9 tables exist in database
- ✅ 2 storage buckets created
- ✅ Test admin user can login
- ✅ `SELECT generate_applicant_id(2026)` returns `IGN-2026-00001`
- ✅ USD constraints enforced
- ✅ Video URL validation works

**Then you're ready for Task 3!** 🚀

---

**Document Version**: 1.0  
**Created**: 2026-04-10  
**Status**: Ready to Execute
