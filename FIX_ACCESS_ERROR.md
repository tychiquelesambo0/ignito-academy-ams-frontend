# Fix: Access Control Error

## Error You're Seeing

```
Unexpected error retrieving remote project status: 
{"message":"Your account does not have the necessary privileges 
to access this endpoint..."}
```

## Why This Happens

This error occurs when:
1. The project belongs to an **organization** (not personal account)
2. You need to authenticate with an **access token**
3. The Supabase CLI needs proper permissions

---

## Solution: Two Options

### **Option 1: Login with Access Token (Recommended)**

#### Step 1: Generate Access Token

1. Go to: https://supabase.com/dashboard/account/tokens
2. Click **"Generate new token"**
3. Name: `CLI Access Token`
4. Click **"Generate token"**
5. **Copy the token** (you won't see it again!)

#### Step 2: Login to Supabase CLI

```bash
supabase login --token YOUR_ACCESS_TOKEN_HERE
```

#### Step 3: Run Migrations

```bash
./run-migrations.sh
```

---

### **Option 2: Use Database URL Directly (Faster)**

This bypasses the CLI linking and connects directly to the database.

#### Run the Fixed Script

```bash
./run-migrations-fixed.sh
```

**When prompted:**
- Project Reference: `wydqspaalooxdssvufgs`
- Database Password: (the one you saved)

**This will:**
- Connect directly to your database
- Apply all 4 migrations
- Verify tables created
- Skip the CLI linking step

---

## Recommended Approach

**Use Option 2** (the fixed script) because:
- ✅ Faster - no token needed
- ✅ Direct database connection
- ✅ Works with organization projects
- ✅ Same result as Option 1

---

## After Migrations Complete

You should see:

```
✅ Success! Found 9 tables in public schema

📋 Tables created:
- applicants
- applications
- admissions_officers
- applicant_id_sequences
- uploaded_documents
- email_logs
- webhook_logs
- audit_trail
- refund_transactions
```

---

## Next Steps

1. **Verify storage buckets**
   - Go to Supabase Dashboard → Storage
   - Should see: `pieces_justificatives` and `official_letters`

2. **Create test admin user**
   - Go to Authentication → Users
   - Email: `admin@ignitoacademy.com`
   - Generate password
   - Auto-confirm ✅

3. **Update admin record**
   ```sql
   UPDATE admissions_officers
   SET id = 'PASTE_UUID_HERE'
   WHERE email = 'admin@ignitoacademy.com';
   ```

---

## Troubleshooting

### "Cannot connect to database"
- Check project reference is correct
- Verify database password
- Ensure no typos

### "Migration already applied"
- This is OK! Migrations are idempotent
- Check if tables exist in Dashboard → Database → Tables

### "Permission denied"
- Verify you're the project owner
- Check organization permissions
- Try generating a new access token

---

**Ready to try? Run:**

```bash
./run-migrations-fixed.sh
```
