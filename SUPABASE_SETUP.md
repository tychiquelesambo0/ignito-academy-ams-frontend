# Supabase Project Setup Guide

## Task 2.1: Create Supabase Project (Europe Region)

### Prerequisites
- Supabase account (sign up at https://supabase.com)
- Access to project repository
- Secure password manager for storing credentials

---

## Step 1: Create Supabase Project

### 1.1 Access Supabase Dashboard
1. Navigate to: https://supabase.com/dashboard
2. Sign in with your account

### 1.2 Create New Organization (if needed)
1. Click **"New organization"**
2. Organization name: `Ignito Academy`
3. Select plan: **Free** (for development) or **Pro** (for production)
4. Click **"Create organization"**

### 1.3 Create New Project
1. Click **"New project"**
2. Fill in project details:
   - **Project name**: `ignito-academy-ams`
   - **Database Password**: Generate strong password (click dice icon)
     - ⚠️ **SAVE THIS PASSWORD SECURELY** - you'll need it for migrations
   - **Region**: Select **Europe (Frankfurt) `eu-central-1`** or **Europe (London) `eu-west-2`**
     - ✅ Closest to DRC for optimal latency
   - **Pricing plan**: Free (development) or Pro (production)
3. Click **"Create new project"**
4. Wait 2-3 minutes for provisioning

---

## Step 2: Collect Project Credentials

### 2.1 Get API Keys
1. Navigate to: **Project Settings** (gear icon) → **API**
2. Copy the following values:

   **Project URL:**
   ```
   https://YOUR_PROJECT_REF.supabase.co
   ```

   **Anon/Public Key (anon key):**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

   **Service Role Key (service_role key):**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   ⚠️ **NEVER expose service_role key in browser/client code**

### 2.2 Get Database Connection String
1. Navigate to: **Project Settings** → **Database**
2. Scroll to **Connection string**
3. Select **URI** tab
4. Copy the connection string:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your database password from Step 1.3

---

## Step 3: Configure Local Environment

### 3.1 Create .env.local File
1. Copy the template:
   ```bash
   cp .env.local.template .env.local
   ```

2. Open `.env.local` and fill in the values:

   ```bash
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.YOUR_PROJECT_REF.supabase.co:5432/postgres

   # Application Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   INTAKE_YEAR=2026
   APPLICATION_FEE_USD=29
   MAX_SCHOLARSHIPS_PER_YEAR=20

   # Payment Provider (use 'mock' for development)
   PAYMENT_PROVIDER=mock

   # Email Service (leave empty for now)
   RESEND_API_KEY=
   FROM_EMAIL=admissions@ignitoacademy.com
   ```

3. Save the file
4. Verify `.env.local` is in `.gitignore` (it should be)

### 3.2 Verify Configuration
```bash
# Check that environment variables are loaded
npm run dev

# You should see no errors related to Supabase connection
```

---

## Step 4: Verify Project Region

### 4.1 Confirm Europe Region
1. Navigate to: **Project Settings** → **General**
2. Verify **Region** shows: `Europe (Frankfurt)` or `Europe (London)`
3. Document the exact region for reference

### 4.2 Update Documentation
Record the following in your project notes:
- **Project Name**: `ignito-academy-ams`
- **Project Reference**: `YOUR_PROJECT_REF`
- **Region**: `eu-central-1` (Frankfurt) or `eu-west-2` (London)
- **Created Date**: 2026-04-10
- **Database Password**: (stored securely in password manager)

---

## Step 5: Enable Required Extensions

### 5.1 Enable pgcrypto (for UUID generation)
1. Navigate to: **Database** → **Extensions**
2. Search for `pgcrypto`
3. Click **Enable** if not already enabled

### 5.2 Enable pg_stat_statements (for query performance monitoring)
1. Search for `pg_stat_statements`
2. Click **Enable**

---

## Verification Checklist

- [ ] Supabase project created in Europe region
- [ ] Database password saved securely
- [ ] Project URL copied to `.env.local`
- [ ] Anon key copied to `.env.local`
- [ ] Service role key copied to `.env.local`
- [ ] Database URL copied to `.env.local`
- [ ] `.env.local` file NOT committed to git
- [ ] `pgcrypto` extension enabled
- [ ] `pg_stat_statements` extension enabled
- [ ] Project region documented

---

## Next Steps

✅ **Task 2.1 Complete**: Supabase project created

**Next Task**: Task 2.2 - Configure Supabase CLI locally

---

## Troubleshooting

### Issue: "Project provisioning failed"
**Solution**: Try a different region or contact Supabase support

### Issue: "Cannot connect to database"
**Solution**: 
1. Verify database password is correct
2. Check if your IP is allowed (Supabase allows all IPs by default)
3. Ensure connection string format is correct

### Issue: "API keys not working"
**Solution**:
1. Regenerate keys in Project Settings → API
2. Update `.env.local` with new keys
3. Restart development server

---

## Security Notes

⚠️ **CRITICAL SECURITY REMINDERS**:

1. **NEVER commit `.env.local` to version control**
2. **NEVER expose `SUPABASE_SERVICE_ROLE_KEY` in browser code**
3. **Store database password in secure password manager**
4. **Rotate keys if accidentally exposed**
5. **Use RLS policies for all data access** (configured in Task 2.6-2.7)

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-10  
**Status**: ✅ Ready for Execution
