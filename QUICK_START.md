# Ignito Academy AMS - Quick Start Guide

## 🚀 Current Status: Ready to Create Brand New Supabase Project

### ✅ What's Done
- [x] Task 1: Project Setup and Configuration (Complete)
- [x] Task 2.2-2.4: Supabase CLI configured, migrations created

### 🎯 What You Need to Do NOW

**Create a BRAND NEW Supabase project (30 minutes):**

**Follow the fast-track guide:**
```
📖 Open: QUICK_START_NEW_PROJECT.md
```

**OR follow the detailed checklist:**
```
📋 Open: NEW_PROJECT_CHECKLIST.md
```

### 📝 Quick Steps Summary

1. **Create Supabase Project** (5 min)
   - Go to https://supabase.com/dashboard
   - Create new project: `ignito-academy-ams`
   - Region: **Europe (Frankfurt or London)**
   - Save database password!

2. **Configure Environment** (1 min)
   ```bash
   ./setup-env.sh
   ```

3. **Run Migrations** (5 min)
   ```bash
   ./run-migrations.sh
   ```

4. **Create Admin User** (3 min)
   - In Supabase Dashboard → Authentication → Users
   - Email: `admin@ignitoacademy.com`

### 📋 After Setup Complete

Once you've created your project and run migrations:

- ✅ **Task 2.5-2.10**: Complete (migrations handle everything)
- 🎯 **Next**: Task 3 - Authentication Setup

---

## 🔑 Critical Information

### Four Non-Negotiable Architectural Pillars

1. **💵 USD Single-Currency**: No CDF, no exchange rates
2. **⛔ OTHM Keyword Ban**: "OTHM" is strictly prohibited
3. **🔐 Supabase Auth ONLY**: No manual password hashing
4. **🎥 Video URLs Only**: YouTube/Vimeo links, no file uploads

### Files Created for You

- ✅ `.env.local.template` - Environment variable template
- ✅ `SUPABASE_SETUP.md` - Detailed setup instructions
- ✅ `QUICK_START.md` - This file

---

## ⚡ Quick Commands

```bash
# Install dependencies (if not done)
npm install

# Start development server
npm run dev

# Run tests
npm test

# Check for OTHM keyword violations
npm run lint
```

---

## 📞 Need Help?

If you encounter any issues:

1. Check `SUPABASE_SETUP.md` troubleshooting section
2. Verify all credentials are correct in `.env.local`
3. Ensure `.env.local` is NOT committed to git
4. Ask me for assistance with specific error messages

---

**Ready to continue? Complete Task 2.1 manually, then tell me when you're ready for Task 2.2!**
