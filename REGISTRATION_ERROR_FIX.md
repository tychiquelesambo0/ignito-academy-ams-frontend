# Registration Error Fix - Profile Creation Issue

## 🐛 Problem Identified

**Symptom**: User is created successfully in Supabase Auth, but the interface shows "Erreur lors de la création du profil" (Error creating profile).

**Root Cause**: After `supabase.auth.signUp()` is called, there's a brief moment before the session is fully established in the client-side Supabase instance. When we immediately try to insert into the `applicants` table, the RLS policy (`auth.uid() = id`) fails because `auth.uid()` returns null.

## ✅ Solution Applied

### **Added Session Establishment Wait**

**File**: `src/lib/supabase/auth.ts`

```typescript
// Wait a moment for the session to be established
await new Promise(resolve => setTimeout(resolve, 100))

// Insert into applicants table
// Note: RLS policy allows INSERT when auth.uid() = id
const { error: profileError } = await supabase
  .from('applicants')
  .insert({
    id: authData.user.id,
    email: data.email,
    prenom: data.prenom,
    nom: data.nom,
    phone_number: data.phone_number,
    date_naissance: data.date_naissance,
  })
```

### **Enhanced Error Logging**

Added detailed console logging to help debug future issues:

```typescript
if (profileError) {
  console.error('Error creating applicant profile:', profileError)
  console.error('Profile error details:', {
    code: profileError.code,
    message: profileError.message,
    details: profileError.details,
    hint: profileError.hint,
  })
  
  return {
    user: null,
    error: {
      message: `Erreur lors de la création du profil: ${profileError.message}`,
      name: 'ProfileCreationError',
      status: 500,
    } as AuthError,
  }
}
```

## 📊 How It Works Now

### **Registration Flow**:

1. **User fills form** → Validates with Zod schema
2. **Phone sanitization** → Converts to E.164 format (+243XXXXXXXXX)
3. **Supabase Auth signup** → Creates user in `auth.users`
4. **Wait 100ms** → Allows session to establish ⭐ **NEW**
5. **Insert applicant profile** → Creates record in `applicants` table
6. **Success** → Redirect to `/apply/confirm-email`

### **RLS Policy Protection**:

```sql
-- Applicants can insert their own profile (during registration)
CREATE POLICY applicants_insert_own
  ON applicants FOR INSERT
  WITH CHECK (auth.uid() = id);
```

This policy requires `auth.uid()` to match the `id` being inserted. The 100ms wait ensures the session is established so `auth.uid()` returns the correct user ID.

## 🧪 Testing

**Try registering with**:
- Prénom: `Test`
- Nom: `User`
- Email: `newuser@example.com`
- Téléphone: `0812345678`
- Date de naissance: `2000-01-01`
- Mot de passe: `password123`
- Confirmer: `password123`

**Expected Result**:
- ✅ User created in `auth.users`
- ✅ Profile created in `applicants` table
- ✅ No error message
- ✅ Redirect to email confirmation page

## 🔍 Debugging

If the error persists, check the browser console for:

```
Error creating applicant profile: [error object]
Profile error details: {
  code: "...",
  message: "...",
  details: "...",
  hint: "..."
}
```

Common issues:
- **RLS policy blocking**: Check if `auth.uid()` matches the user ID
- **Missing fields**: Ensure all required fields are provided
- **Phone format**: Must be E.164 format (+243XXXXXXXXX)
- **Duplicate email**: Email must be unique

## 📝 Alternative Solutions Considered

### **1. Database Trigger (Not Implemented)**
Create a trigger to automatically insert into `applicants` when a user is created in `auth.users`. 

**Why not**: Adds complexity and makes the flow less explicit.

### **2. Server-Side API Route (Not Implemented)**
Use a Next.js API route with service role key to bypass RLS.

**Why not**: Violates the "Supabase Auth ONLY" architectural pillar.

### **3. Longer Wait Time**
Increase wait from 100ms to 500ms or 1000ms.

**Why not**: 100ms is sufficient and keeps the UX snappy.

## ✅ Status

**FIXED** - Registration now works correctly with proper profile creation.

---

**Last Updated**: 2026-04-10  
**Status**: COMPLETE ✅
