-- ============================================================================
-- IGNITO ACADEMY AMS — STORAGE BUCKETS & POLICIES
-- ============================================================================
-- Migration: 20260410000003_storage_buckets.sql
-- Created: 2026-04-10
-- Description: Create storage buckets for documents and PDFs (NO video bucket)
--
-- CRITICAL: Video URLs only (YouTube/Vimeo) - NO video file uploads
-- ============================================================================

-- ============================================================================
-- BUCKET: pieces_justificatives
-- ============================================================================
-- Purpose: Applicant document uploads (PDFs, images ONLY)
-- Max file size: 5MB
-- Allowed types: PDF, JPEG, PNG

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pieces_justificatives',
  'pieces_justificatives',
  FALSE, -- Private bucket
  5242880, -- 5MB in bytes
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

-- ============================================================================
-- BUCKET: official_letters
-- ============================================================================
-- Purpose: Generated PDF decision letters
-- Max file size: 10MB
-- Allowed types: PDF only

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'official_letters',
  'official_letters',
  FALSE, -- Private bucket
  10485760, -- 10MB in bytes
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf'];

-- ============================================================================
-- STORAGE RLS POLICIES: pieces_justificatives
-- ============================================================================

-- Applicants can upload to their own folder ONLY if payment is Confirmed or Waived
CREATE POLICY "Applicants can upload documents after payment"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pieces_justificatives' AND
    (storage.foldername(name))[1] = (
      SELECT intake_year::TEXT FROM applications
      WHERE user_id = auth.uid()
      LIMIT 1
    ) AND
    (storage.foldername(name))[2] = (
      SELECT applicant_id FROM applications
      WHERE user_id = auth.uid()
      LIMIT 1
    ) AND
    EXISTS (
      SELECT 1 FROM applications
      WHERE user_id = auth.uid()
        AND payment_status IN ('Confirmed', 'Waived')
    )
  );

-- Applicants can read their own documents
CREATE POLICY "Applicants can read own documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pieces_justificatives' AND
    (storage.foldername(name))[2] = (
      SELECT applicant_id FROM applications
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- Applicants can delete their own documents
CREATE POLICY "Applicants can delete own documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pieces_justificatives' AND
    (storage.foldername(name))[2] = (
      SELECT applicant_id FROM applications
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- Admissions officers can read all documents
CREATE POLICY "Admissions officers can read all documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pieces_justificatives' AND
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- ============================================================================
-- STORAGE RLS POLICIES: official_letters
-- ============================================================================

-- System can upload official letters (service role)
CREATE POLICY "System can upload official letters"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'official_letters');

-- Applicants can read their own official letters
CREATE POLICY "Applicants can read own official letters"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'official_letters' AND
    (storage.foldername(name))[2] LIKE (
      SELECT applicant_id || '%' FROM applications
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- Admissions officers can read all official letters
CREATE POLICY "Admissions officers can read all official letters"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'official_letters' AND
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- Admissions officers can upload official letters
CREATE POLICY "Admissions officers can upload official letters"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'official_letters' AND
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- ============================================================================
-- STORAGE BUCKETS COMPLETE
-- ============================================================================

-- Note: Cannot comment on storage schema (requires owner privileges)
-- COMMENT ON SCHEMA storage IS 'Storage buckets for documents and PDFs - NO video file uploads';

-- Verify buckets created
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'pieces_justificatives') THEN
    RAISE EXCEPTION 'Bucket pieces_justificatives not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'official_letters') THEN
    RAISE EXCEPTION 'Bucket official_letters not created';
  END IF;
  
  RAISE NOTICE 'Storage buckets created successfully';
END $$;
