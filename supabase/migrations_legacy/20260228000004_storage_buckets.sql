-- =============================================
-- Ignito Academy AMS - Storage Buckets & Policies
-- Migration: 004_storage_buckets
-- Created: 2026-02-28
-- =============================================

-- =============================================
-- SECTION 1: CREATE STORAGE BUCKETS
-- =============================================

-- Bucket: pieces_justificatives
-- Purpose: Store applicant-uploaded documents (exam results, certificates)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pieces_justificatives',
  'pieces_justificatives',
  false,
  5242880, -- 5MB in bytes
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
);

-- Bucket: official_letters
-- Purpose: Store system-generated PDF acceptance letters
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'official_letters',
  'official_letters',
  false,
  10485760, -- 10MB in bytes
  ARRAY['application/pdf']
);

-- =============================================
-- SECTION 2: RLS POLICIES FOR pieces_justificatives
-- =============================================

-- Applicants can upload to their own folder (after payment)
CREATE POLICY pieces_justificatives_insert_own
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pieces_justificatives' AND
    (storage.foldername(name))[1] = (
      SELECT intake_year::TEXT FROM applications
      WHERE user_id = auth.uid() AND payment_status = 'Confirmed'
      LIMIT 1
    ) AND
    (storage.foldername(name))[2] = (
      SELECT applicant_id FROM applications
      WHERE user_id = auth.uid() AND payment_status = 'Confirmed'
      LIMIT 1
    )
  );

-- Applicants can read their own documents
CREATE POLICY pieces_justificatives_select_own
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pieces_justificatives' AND
    (storage.foldername(name))[2] IN (
      SELECT applicant_id FROM applications WHERE user_id = auth.uid()
    )
  );

-- Admissions officers can read all documents
CREATE POLICY pieces_justificatives_select_admin
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pieces_justificatives' AND
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- Applicants can update/replace their own documents
CREATE POLICY pieces_justificatives_update_own
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pieces_justificatives' AND
    (storage.foldername(name))[2] IN (
      SELECT applicant_id FROM applications 
      WHERE user_id = auth.uid() AND payment_status = 'Confirmed'
    )
  );

-- Applicants can delete their own documents
CREATE POLICY pieces_justificatives_delete_own
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pieces_justificatives' AND
    (storage.foldername(name))[2] IN (
      SELECT applicant_id FROM applications WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- SECTION 3: RLS POLICIES FOR official_letters
-- =============================================

-- Only Edge Functions can insert (via service role)
CREATE POLICY official_letters_insert_system
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'official_letters');

-- Applicants can read their own letters
CREATE POLICY official_letters_select_own
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'official_letters' AND
    name LIKE '%' || (
      SELECT applicant_id FROM applications WHERE user_id = auth.uid() LIMIT 1
    ) || '%'
  );

-- Admissions officers can read all letters
CREATE POLICY official_letters_select_admin
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'official_letters' AND
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- =============================================
-- NOTES ON STORAGE POLICIES
-- =============================================

-- pieces_justificatives bucket policies:
-- - insert_own: Applicants can upload documents to their folder after payment confirmation
-- - select_own: Applicants can view their own uploaded documents
-- - select_admin: Admissions officers can view all applicant documents
-- - update_own: Applicants can replace their own documents
-- - delete_own: Applicants can delete their own documents

-- official_letters bucket policies:
-- - insert_system: Only system (Edge Functions) can generate official letters
-- - select_own: Applicants can view their own acceptance letters
-- - select_admin: Admissions officers can view all official letters
