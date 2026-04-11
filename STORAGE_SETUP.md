# Supabase Storage Setup Instructions

## Problem
Document uploads are failing because the Supabase Storage bucket doesn't exist yet.

## Solution
You need to create the storage bucket in your Supabase project.

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `documents`
   - **Public**: Unchecked (private bucket)
   - **File size limit**: 5MB
   - **Allowed MIME types**: `application/pdf`, `image/jpeg`, `image/png`
5. Click **Create bucket**

### Option 2: Using SQL

Run the SQL script in your Supabase SQL Editor:

```bash
# From your project root
cat supabase/storage-setup.sql
```

Then copy and paste the contents into Supabase SQL Editor and run it.

### Option 3: Using Supabase CLI

```bash
# Make sure you're logged in
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
supabase db push
```

## Verify Setup

After creating the bucket, try uploading a document again. The error message will now show specific details if there are any remaining issues.

## Storage Policies

The storage bucket has the following policies:
- ✅ Authenticated users can upload to their application folders
- ✅ Users can view their own documents
- ✅ Admins can view all documents
- ✅ Admins can delete documents

## Folder Structure

Documents are stored in this structure:
```
documents/
  pieces_justificatives/
    2026/
      IGN-2026-00001/
        1234567890_transcript.pdf
        1234567891_id_card.jpg
      IGN-2026-00002/
        ...
```
