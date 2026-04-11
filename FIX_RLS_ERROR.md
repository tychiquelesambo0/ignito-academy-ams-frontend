# Fix RLS Error - Auto-Create Applicant Profile

## 🐛 Problem

Error: `new row violates row-level security policy for table "applicants"`

**What's happening:**
1. ✅ User IS created in `auth.users`
2. ✅ Confirmation email IS sent
3. ❌ Applicant profile creation FAILS due to RLS policy

**Root Cause:** The client-side Supabase instance doesn't have an established session immediately after `signUp()`, so `auth.uid()` returns `null` when trying to insert into the `applicants` table, causing the RLS policy to block the insert.

## ✅ Solution: Database Trigger

Instead of manually inserting the applicant profile from the client, we'll use a **database trigger** that automatically creates the profile when a user signs up.

### **Step 1: Run the Migration**

Go to your **Supabase Dashboard** → **SQL Editor** and run this SQL:

```sql
-- ============================================================================
-- AUTO-CREATE APPLICANT PROFILE TRIGGER
-- ============================================================================

-- Function to create applicant profile from auth.users metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_prenom VARCHAR(100);
  v_nom VARCHAR(100);
  v_phone VARCHAR(20);
  v_date_naissance DATE;
BEGIN
  -- Extract metadata from auth.users
  v_prenom := NEW.raw_user_meta_data->>'prenom';
  v_nom := NEW.raw_user_meta_data->>'nom';
  v_phone := NEW.raw_user_meta_data->>'phone_number';
  v_date_naissance := (NEW.raw_user_meta_data->>'date_naissance')::DATE;
  
  -- Only insert if all required fields are present
  IF v_prenom IS NOT NULL AND v_nom IS NOT NULL AND v_phone IS NOT NULL AND v_date_naissance IS NOT NULL THEN
    INSERT INTO public.applicants (
      id,
      email,
      prenom,
      nom,
      phone_number,
      date_naissance
    )
    VALUES (
      NEW.id,
      NEW.email,
      v_prenom,
      v_nom,
      v_phone,
      v_date_naissance
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create applicant profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates applicant profile when user signs up via Supabase Auth';
```

### **Step 2: Verify the Trigger**

After running the SQL, verify the trigger was created:

1. Go to **Database** → **Triggers** in Supabase Dashboard
2. You should see: `on_auth_user_created` on table `auth.users`

### **Step 3: Test Registration**

Now try registering a new user:

1. Go to `/apply`
2. Fill in the registration form
3. Click "Créer mon compte"

**Expected Result:**
- ✅ User created in `auth.users`
- ✅ Applicant profile automatically created in `applicants` table
- ✅ No RLS error
- ✅ Redirect to email confirmation page

## 📊 How It Works

### **Before (Manual Insert - FAILED)**
```
User signs up
  ↓
Auth user created
  ↓
Client tries to insert applicant profile
  ↓
❌ RLS blocks (no session yet)
```

### **After (Database Trigger - SUCCESS)**
```
User signs up
  ↓
Auth user created
  ↓
✅ Trigger automatically creates applicant profile
  ↓
Success!
```

## 🔍 What Changed in Code

### **File**: `src/lib/supabase/auth.ts`

**Before:**
```typescript
// Manually insert into applicants table
const { error: profileError } = await supabase
  .from('applicants')
  .insert({ ... })

if (profileError) {
  return { user: null, error: profileError }
}
```

**After:**
```typescript
// Note: Applicant profile is automatically created by database trigger
// See migration: 20260410000005_auto_create_applicant_profile.sql
// The trigger reads user metadata and creates the applicants table record

return { user: authData.user, error: null }
```

## ✅ Benefits of This Approach

1. **No RLS Issues** - Trigger runs with `SECURITY DEFINER` (elevated privileges)
2. **Atomic Operation** - Profile creation happens in the same transaction as user creation
3. **Simpler Client Code** - No need to handle profile creation errors
4. **Consistent** - Every user signup automatically gets a profile
5. **Follows Best Practices** - Database-level data integrity

## 🧪 Testing Checklist

After running the migration, test:

- [ ] New user registration works without errors
- [ ] Applicant profile is created in database
- [ ] User receives confirmation email
- [ ] No RLS errors in console
- [ ] Redirect to confirmation page works

## 📝 Files Modified

### **Created:**
- `supabase/migrations/20260410000005_auto_create_applicant_profile.sql` - Trigger migration

### **Modified:**
- `src/lib/supabase/auth.ts` - Removed manual profile insert

---

**Status**: Ready to test after running the SQL migration!  
**Last Updated**: 2026-04-10
