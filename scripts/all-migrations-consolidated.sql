-- ================================================================
-- Migration: 20260228000001_initial_schema.sql
-- ================================================================
-- =============================================
-- Ignito Academy AMS - Initial Database Schema
-- Migration: 001_initial_schema
-- Created: 2026-02-28
-- =============================================

-- =============================================
-- SECTION 1: CUSTOM ENUM TYPES
-- =============================================

CREATE TYPE application_status_enum AS ENUM (
  'Dossier Créé',
  'Frais Réglés',
  'En Cours d''Évaluation',
  'Admission sous réserve',
  'Admission définitive',
  'Dossier refusé'
);

CREATE TYPE payment_status_enum AS ENUM (
  'Pending',
  'Confirmed',
  'Failed'
);

CREATE TYPE exam_status_enum AS ENUM (
  'En attente des résultats',
  'Diplôme obtenu'
);

CREATE TYPE email_status_enum AS ENUM (
  'sent',
  'failed',
  'pending'
);

-- =============================================
-- SECTION 2: TABLES
-- =============================================

-- ---------------------------------------------
-- Table: applicants
-- Stores base user profile information for all applicants
-- ---------------------------------------------
CREATE TABLE applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(13) NOT NULL UNIQUE,
  prenom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  date_naissance DATE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT phone_format CHECK (phone_number ~ '^\+243[0-9]{9}$'),
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_applicants_email ON applicants(email);
CREATE INDEX idx_applicants_phone ON applicants(phone_number);

-- ---------------------------------------------
-- Table: applications
-- Stores application records (1-to-Many relationship with applicants)
-- ---------------------------------------------
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id VARCHAR(20) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  intake_year INTEGER NOT NULL,
  
  -- Academic History
  ecole_provenance VARCHAR(255) NOT NULL,
  option_academique VARCHAR(100) NOT NULL,
  exam_status exam_status_enum NOT NULL,
  
  -- Status Fields
  application_status application_status_enum NOT NULL DEFAULT 'Dossier Créé',
  payment_status payment_status_enum NOT NULL DEFAULT 'Pending',
  
  -- Payment Tracking
  transaction_id VARCHAR(100),
  payment_confirmed_at TIMESTAMPTZ,
  
  -- Optimistic Locking
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT applicant_id_format CHECK (applicant_id ~ '^IGN-[0-9]{4}-[0-9]{5}$'),
  CONSTRAINT intake_year_valid CHECK (intake_year >= 2025 AND intake_year <= 2050),
  CONSTRAINT payment_confirmed_when_status_paid CHECK (
    (payment_status = 'Confirmed' AND payment_confirmed_at IS NOT NULL) OR
    (payment_status != 'Confirmed' AND payment_confirmed_at IS NULL)
  )
);

CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_applicant_id ON applications(applicant_id);
CREATE INDEX idx_applications_intake_year ON applications(intake_year);
CREATE INDEX idx_applications_status ON applications(application_status, payment_status);

-- ---------------------------------------------
-- Table: applicant_id_sequences
-- Manages sequential counter for Applicant_ID generation
-- ---------------------------------------------
CREATE TABLE applicant_id_sequences (
  intake_year INTEGER PRIMARY KEY,
  current_sequence INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT sequence_range CHECK (current_sequence >= 0 AND current_sequence <= 99999)
);

-- Initialize for current year (2026)
INSERT INTO applicant_id_sequences (intake_year, current_sequence) 
VALUES (2026, 0);

-- ---------------------------------------------
-- Table: admissions_officers
-- Stores administrative user accounts
-- ---------------------------------------------
CREATE TABLE admissions_officers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admissions_officer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admissions_officers_email ON admissions_officers(email);

-- ---------------------------------------------
-- Table: audit_trail
-- Immutable log of all application status changes
-- ---------------------------------------------
CREATE TABLE audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id VARCHAR(20) NOT NULL,
  admin_id UUID NOT NULL REFERENCES admissions_officers(id),
  previous_status application_status_enum NOT NULL,
  new_status application_status_enum NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_trail_applicant_id ON audit_trail(applicant_id);
CREATE INDEX idx_audit_trail_admin_id ON audit_trail(admin_id);
CREATE INDEX idx_audit_trail_created_at ON audit_trail(created_at DESC);

-- Prevent modifications to audit records
CREATE RULE audit_trail_no_update AS ON UPDATE TO audit_trail DO INSTEAD NOTHING;
CREATE RULE audit_trail_no_delete AS ON DELETE TO audit_trail DO INSTEAD NOTHING;

-- ---------------------------------------------
-- Table: uploaded_documents
-- Tracks document uploads with metadata
-- ---------------------------------------------
CREATE TABLE uploaded_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id VARCHAR(20) NOT NULL,
  user_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT file_size_limit CHECK (file_size_bytes <= 5242880), -- 5MB
  CONSTRAINT mime_type_allowed CHECK (mime_type IN (
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ))
);

CREATE INDEX idx_uploaded_documents_applicant_id ON uploaded_documents(applicant_id);
CREATE INDEX idx_uploaded_documents_user_id ON uploaded_documents(user_id);

-- ---------------------------------------------
-- Table: email_logs
-- Tracks email delivery status for reliability monitoring
-- ---------------------------------------------
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id VARCHAR(20) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject TEXT NOT NULL,
  email_type VARCHAR(50) NOT NULL, -- 'payment_confirmation', 'conditional_acceptance', 'final_acceptance'
  status email_status_enum NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT max_retries CHECK (retry_count <= 3)
);

CREATE INDEX idx_email_logs_applicant_id ON email_logs(applicant_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);

-- ---------------------------------------------
-- Table: webhook_logs
-- Tracks incoming Nomba webhooks to ensure idempotency
-- ---------------------------------------------
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(100) NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_transaction_id ON webhook_logs(transaction_id);

-- =============================================
-- SECTION 3: TRIGGERS
-- =============================================

-- ---------------------------------------------
-- Trigger Function: update_updated_at_timestamp()
-- Automatically updates updated_at column on row modification
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Attach triggers to tables
CREATE TRIGGER applicants_updated_at BEFORE UPDATE ON applicants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER admissions_officers_updated_at BEFORE UPDATE ON admissions_officers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

-- =============================================
-- SECTION 4: COMMENTS
-- =============================================

COMMENT ON TABLE applicants IS 'Base user profile information for all applicants';
COMMENT ON TABLE applications IS 'Application records with 1-to-Many relationship to applicants';
COMMENT ON TABLE applicant_id_sequences IS 'Sequential counter for Applicant_ID generation';
COMMENT ON TABLE admissions_officers IS 'Administrative user accounts for staff';
COMMENT ON TABLE audit_trail IS 'Immutable log of all application status changes for accreditation compliance';
COMMENT ON TABLE uploaded_documents IS 'Document uploads with metadata and validation';
COMMENT ON TABLE email_logs IS 'Email delivery tracking for reliability monitoring';
COMMENT ON TABLE webhook_logs IS 'Nomba webhook receipts for idempotent payment processing';


-- ================================================================
-- Migration: 20260228000002_database_functions.sql
-- ================================================================
-- =============================================
-- Ignito Academy AMS - Database Functions
-- Migration: 002_database_functions
-- Created: 2026-02-28
-- =============================================

-- =============================================
-- FUNCTION: generate_applicant_id()
-- Purpose: Atomically generates next Applicant_ID for given intake year
-- Returns: Applicant_ID in format IGN-[YEAR]-[SEQUENCE]
-- =============================================

CREATE OR REPLACE FUNCTION generate_applicant_id(p_intake_year INTEGER)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
AS $$
DECLARE
  v_sequence INTEGER;
  v_applicant_id VARCHAR(20);
BEGIN
  -- Lock row for update to prevent race conditions
  SELECT current_sequence INTO v_sequence
  FROM applicant_id_sequences
  WHERE intake_year = p_intake_year
  FOR UPDATE;
  
  -- If year doesn't exist, initialize it
  IF v_sequence IS NULL THEN
    INSERT INTO applicant_id_sequences (intake_year, current_sequence)
    VALUES (p_intake_year, 0)
    RETURNING current_sequence INTO v_sequence;
  END IF;
  
  -- Increment sequence
  v_sequence := v_sequence + 1;
  
  -- Update sequence counter
  UPDATE applicant_id_sequences
  SET current_sequence = v_sequence, updated_at = NOW()
  WHERE intake_year = p_intake_year;
  
  -- Format Applicant_ID: IGN-[YEAR]-[SEQUENCE]
  v_applicant_id := 'IGN-' || p_intake_year::TEXT || '-' || LPAD(v_sequence::TEXT, 5, '0');
  
  RETURN v_applicant_id;
END;
$$;

COMMENT ON FUNCTION generate_applicant_id(INTEGER) IS 'Atomically generates next Applicant_ID with row-level locking for concurrency safety';

-- =============================================
-- FUNCTION: update_application_status_with_version_check()
-- Purpose: Updates application status with optimistic locking
-- Returns: TRUE if update succeeded, FALSE if version mismatch detected
-- =============================================

CREATE OR REPLACE FUNCTION update_application_status_with_version_check(
  p_applicant_id VARCHAR(20),
  p_new_status application_status_enum,
  p_expected_version INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_version INTEGER;
  v_rows_updated INTEGER;
BEGIN
  -- Check current version
  SELECT version INTO v_current_version
  FROM applications
  WHERE applicant_id = p_applicant_id
  FOR UPDATE;
  
  -- Version mismatch (concurrent edit detected)
  IF v_current_version != p_expected_version THEN
    RETURN FALSE;
  END IF;
  
  -- Update with version increment
  UPDATE applications
  SET 
    application_status = p_new_status,
    version = version + 1,
    updated_at = NOW()
  WHERE applicant_id = p_applicant_id;
  
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  
  RETURN v_rows_updated = 1;
END;
$$;

COMMENT ON FUNCTION update_application_status_with_version_check(VARCHAR, application_status_enum, INTEGER) IS 'Updates application status with optimistic locking to prevent concurrent edit conflicts';

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Test generate_applicant_id function
DO $$
DECLARE
  v_test_id VARCHAR(20);
BEGIN
  -- Generate test ID for 2026
  v_test_id := generate_applicant_id(2026);
  
  -- Verify format
  IF v_test_id !~ '^IGN-2026-[0-9]{5}$' THEN
    RAISE EXCEPTION 'Applicant ID format validation failed: %', v_test_id;
  END IF;
  
  -- Verify it's IGN-2026-00001 (first ID)
  IF v_test_id != 'IGN-2026-00001' THEN
    RAISE EXCEPTION 'Expected IGN-2026-00001, got %', v_test_id;
  END IF;
  
  RAISE NOTICE 'generate_applicant_id() test passed: %', v_test_id;
END;
$$;


-- ================================================================
-- Migration: 20260228000003_rls_policies.sql
-- ================================================================
-- =============================================
-- Ignito Academy AMS - Row Level Security Policies
-- Migration: 003_rls_policies
-- Created: 2026-02-28
-- =============================================

-- =============================================
-- SECTION 1: ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicant_id_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE admissions_officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECTION 2: APPLICANTS TABLE POLICIES
-- =============================================

-- Applicants can read their own profile
CREATE POLICY applicants_select_own
  ON applicants FOR SELECT
  USING (auth.uid() = id);

-- Applicants can update their own profile (except email/phone after creation)
CREATE POLICY applicants_update_own
  ON applicants FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    email = (SELECT email FROM applicants WHERE id = auth.uid()) AND
    phone_number = (SELECT phone_number FROM applicants WHERE id = auth.uid())
  );

-- Admissions officers can read all applicants
CREATE POLICY applicants_select_admin
  ON applicants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- Public insert for registration
CREATE POLICY applicants_insert_public
  ON applicants FOR INSERT
  WITH CHECK (TRUE);

-- =============================================
-- SECTION 3: APPLICATIONS TABLE POLICIES
-- =============================================

-- Applicants can read their own applications
CREATE POLICY applications_select_own
  ON applications FOR SELECT
  USING (user_id = auth.uid());

-- Applicants can update their own applications (before payment only)
CREATE POLICY applications_update_own
  ON applications FOR UPDATE
  USING (user_id = auth.uid() AND payment_status != 'Confirmed')
  WITH CHECK (
    user_id = auth.uid() AND
    payment_status != 'Confirmed' AND
    application_status = 'Dossier Créé'
  );

-- Applicants can insert their own applications
CREATE POLICY applications_insert_own
  ON applications FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admissions officers can read all applications
CREATE POLICY applications_select_admin
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- Admissions officers can update application status
CREATE POLICY applications_update_admin
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- =============================================
-- SECTION 4: APPLICANT_ID_SEQUENCES TABLE POLICIES
-- =============================================

-- Only system/service role can interact with sequences
-- No user-facing policies needed - accessed via RPC functions only

-- =============================================
-- SECTION 5: ADMISSIONS_OFFICERS TABLE POLICIES
-- =============================================

-- Officers can read their own profile
CREATE POLICY admissions_officers_select_own
  ON admissions_officers FOR SELECT
  USING (auth.uid() = id);

-- Officers can update their own profile (except role and is_active)
CREATE POLICY admissions_officers_update_own
  ON admissions_officers FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM admissions_officers WHERE id = auth.uid()) AND
    is_active = (SELECT is_active FROM admissions_officers WHERE id = auth.uid())
  );

-- =============================================
-- SECTION 6: AUDIT_TRAIL TABLE POLICIES
-- =============================================

-- Only admissions officers can read audit trail
CREATE POLICY audit_trail_select_admin
  ON audit_trail FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- Only admissions officers can insert audit records
CREATE POLICY audit_trail_insert_admin
  ON audit_trail FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- No updates or deletes allowed (enforced by rules in initial schema)

-- =============================================
-- SECTION 7: UPLOADED_DOCUMENTS TABLE POLICIES
-- =============================================

-- Applicants can read their own documents
CREATE POLICY uploaded_documents_select_own
  ON uploaded_documents FOR SELECT
  USING (user_id = auth.uid());

-- Applicants can insert their own documents (after payment confirmed)
CREATE POLICY uploaded_documents_insert_own
  ON uploaded_documents FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.applicant_id = uploaded_documents.applicant_id
        AND applications.user_id = auth.uid()
        AND applications.payment_status = 'Confirmed'
    )
  );

-- Admissions officers can read all documents
CREATE POLICY uploaded_documents_select_admin
  ON uploaded_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- =============================================
-- SECTION 8: EMAIL_LOGS TABLE POLICIES
-- =============================================

-- Only admissions officers can read email logs
CREATE POLICY email_logs_select_admin
  ON email_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- System can insert email logs (via service role)
CREATE POLICY email_logs_insert_system
  ON email_logs FOR INSERT
  WITH CHECK (TRUE);

-- System can update email logs for retry logic
CREATE POLICY email_logs_update_system
  ON email_logs FOR UPDATE
  USING (TRUE)
  WITH CHECK (TRUE);

-- =============================================
-- SECTION 9: WEBHOOK_LOGS TABLE POLICIES
-- =============================================

-- Enable RLS but allow service role full access
-- Only system/service role can interact with webhook logs
CREATE POLICY webhook_logs_service_role_all
  ON webhook_logs
  USING (TRUE)
  WITH CHECK (TRUE);

-- =============================================
-- SECTION 10: STORAGE BUCKET POLICIES
-- =============================================

-- Note: Storage bucket policies will be created in Task 7
-- when the buckets are created. This migration focuses on
-- database table RLS policies only.

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON POLICY applicants_select_own ON applicants IS 'Applicants can read their own profile';
COMMENT ON POLICY applicants_update_own ON applicants IS 'Applicants can update their own profile (email/phone immutable after creation)';
COMMENT ON POLICY applicants_select_admin ON applicants IS 'Admissions officers can read all applicant profiles';
COMMENT ON POLICY applicants_insert_public ON applicants IS 'Public registration allowed for new applicants';

COMMENT ON POLICY applications_select_own ON applications IS 'Applicants can read their own applications';
COMMENT ON POLICY applications_update_own ON applications IS 'Applicants can update applications before payment only';
COMMENT ON POLICY applications_insert_own ON applications IS 'Applicants can create their own applications';
COMMENT ON POLICY applications_select_admin ON applications IS 'Admissions officers can read all applications';
COMMENT ON POLICY applications_update_admin ON applications IS 'Admissions officers can update application status';

COMMENT ON POLICY audit_trail_select_admin ON audit_trail IS 'Only admissions officers can read audit trail';
COMMENT ON POLICY audit_trail_insert_admin ON audit_trail IS 'Only admissions officers can create audit records';

COMMENT ON POLICY uploaded_documents_select_own ON uploaded_documents IS 'Applicants can read their own uploaded documents';
COMMENT ON POLICY uploaded_documents_insert_own ON uploaded_documents IS 'Applicants can upload documents after payment confirmation';
COMMENT ON POLICY uploaded_documents_select_admin ON uploaded_documents IS 'Admissions officers can read all uploaded documents';

COMMENT ON POLICY email_logs_select_admin ON email_logs IS 'Only admissions officers can view email delivery logs';
COMMENT ON POLICY email_logs_insert_system ON email_logs IS 'System can log email attempts';
COMMENT ON POLICY email_logs_update_system ON email_logs IS 'System can update email logs for retry tracking';

COMMENT ON POLICY webhook_logs_service_role_all ON webhook_logs IS 'Service role has full access to webhook logs for idempotent payment processing';


-- ================================================================
-- Migration: 20260228000004_storage_buckets.sql
-- ================================================================
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


-- ================================================================
-- Migration: 20260228000005_fix_sequence_rls.sql
-- ================================================================
-- =============================================
-- Fix RLS Policies for applicant_id_sequences
-- Migration: 005_fix_sequence_rls
-- Created: 2026-02-28
-- =============================================

-- The generate_applicant_id() function needs to insert/update sequences
-- Allow authenticated users to insert new sequences for their intake year
CREATE POLICY applicant_id_sequences_insert_authenticated
  ON applicant_id_sequences FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update sequences (for atomic increment)
CREATE POLICY applicant_id_sequences_update_authenticated
  ON applicant_id_sequences FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to select sequences (needed for the function)
CREATE POLICY applicant_id_sequences_select_authenticated
  ON applicant_id_sequences FOR SELECT
  TO authenticated
  USING (true);


-- ================================================================
-- Migration: 20260301000000_create_storage_bucket.sql
-- ================================================================
-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  false, 
  5242880, 
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;

-- Policy: Allow authenticated users to upload documents
CREATE POLICY "Users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
);

-- Policy: Allow authenticated users to read documents
CREATE POLICY "Users can view documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
);

-- Policy: Allow users to update their documents
CREATE POLICY "Users can update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
);

-- Policy: Allow users to delete their documents
CREATE POLICY "Users can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
);


-- ================================================================
-- Migration: 20260301000001_fix_document_upload_rls.sql
-- ================================================================
-- Fix RLS policy for uploaded_documents to allow uploads before payment
-- This aligns with the new flow: Academic History -> Documents -> Payment

-- Drop the old policy that required payment confirmation
DROP POLICY IF EXISTS uploaded_documents_insert_own ON uploaded_documents;

-- Create new policy that allows document upload for any authenticated user's own application
CREATE POLICY uploaded_documents_insert_own
  ON uploaded_documents FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.applicant_id = uploaded_documents.applicant_id
        AND applications.user_id = auth.uid()
    )
  );

COMMENT ON POLICY uploaded_documents_insert_own ON uploaded_documents IS 'Applicants can upload documents for their own applications (payment not required)';


-- ================================================================
-- Migration: 20260301000002_allow_payment_confirmation.sql
-- ================================================================
-- Allow payment confirmation updates for mock payments and webhooks
-- This migration updates the RLS policy to allow payment_status and application_status updates

-- Drop the old restrictive policy
DROP POLICY IF EXISTS applications_update_own ON applications;

-- Create new policy that allows payment confirmation
CREATE POLICY applications_update_own
  ON applications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() AND
    (
      -- Allow updating before payment is confirmed
      (payment_status != 'Confirmed' AND application_status = 'Dossier Créé')
      OR
      -- Allow confirming payment (for mock payments and webhooks)
      (payment_status = 'Confirmed' AND application_status IN ('Frais Réglés', 'Dossier Créé'))
    )
  );

COMMENT ON POLICY applications_update_own ON applications IS 'Applicants can update applications before payment, and payment can be confirmed via API';


-- ================================================================
-- Migration: 20260304000001_add_document_type.sql
-- ================================================================
-- Add document_type column to uploaded_documents table
-- Required document types: identification, diploma, bulletin_10, bulletin_11, bulletin_12

ALTER TABLE uploaded_documents
  ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'other'
    CHECK (document_type IN (
      'identification',
      'diploma',
      'bulletin_10',
      'bulletin_11',
      'bulletin_12',
      'other'
    ));

-- Index for fast lookup by applicant + type
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_type
  ON uploaded_documents(applicant_id, document_type);

-- Allow applicants to delete their own documents (e.g. to replace them)
CREATE POLICY uploaded_documents_delete_own
  ON uploaded_documents FOR DELETE
  USING (user_id = auth.uid());


-- ================================================================
-- Migration: 20260304000002_simplify_application_status.sql
-- ================================================================
-- Simplify application lifecycle to 3 core phases
-- Phase 1: initial creation  → 'Dossier Créé'   (existing)
-- Phase 2: under evaluation  → 'en_cours_devaluation' (new)
-- Phase 3: final decision    → existing decision statuses

-- 1. Add new enum values
ALTER TYPE application_status_enum ADD VALUE IF NOT EXISTS 'en_cours_devaluation';
ALTER TYPE payment_status_enum     ADD VALUE IF NOT EXISTS 'paid';

-- 2. Replace payment consistency constraint to accept both 'Confirmed' (legacy) and 'paid'
ALTER TABLE applications DROP CONSTRAINT payment_confirmed_when_status_paid;
ALTER TABLE applications ADD CONSTRAINT payment_confirmed_when_status_paid CHECK (
  (payment_status IN ('Confirmed', 'paid') AND payment_confirmed_at IS NOT NULL) OR
  (payment_status NOT IN ('Confirmed', 'paid') AND payment_confirmed_at IS NULL)
);

-- 3. Migrate any existing 'Frais Réglés' records to 'en_cours_devaluation'
UPDATE applications
  SET application_status = 'en_cours_devaluation'
  WHERE application_status = 'Frais Réglés';


-- ================================================================
-- Migration: 20260305000001_add_conditional_admission.sql
-- ================================================================
-- Migration: Add admission_conditionnelle status and conditional_message column
-- Purpose: Support the "Conditional Admission Loop" where an admin can request
--          additional documents from an applicant without issuing a final decision.

-- 1. Add new enum value
ALTER TYPE application_status_enum ADD VALUE IF NOT EXISTS 'admission_conditionnelle';

-- 2. Add conditional_message column (nullable — only populated for conditional status)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS conditional_message TEXT NULL;

-- 3. Extend uploaded_documents document_type check to include conditional uploads
ALTER TABLE uploaded_documents DROP CONSTRAINT IF EXISTS uploaded_documents_document_type_check;
ALTER TABLE uploaded_documents ADD CONSTRAINT uploaded_documents_document_type_check
  CHECK (document_type = ANY (ARRAY[
    'identification', 'diploma', 'bulletin_10', 'bulletin_11', 'bulletin_12',
    'other', 'document_conditionnel'
  ]));

-- 4. Index for dashboard query (quickly find conditional apps)
CREATE INDEX IF NOT EXISTS idx_applications_conditional
  ON applications (application_status)
  WHERE application_status = 'admission_conditionnelle';

-- 4. Update applicant's own-update RLS to allow the resubmission transition
--    (admission_conditionnelle → en_cours_devaluation).
DROP POLICY IF EXISTS applications_update_own ON applications;

CREATE POLICY applications_update_own ON applications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() AND (
      -- Normal pre-payment editing
      (payment_status NOT IN ('Confirmed', 'paid') AND application_status = 'Dossier Créé')
      -- Legacy Confirmed path
      OR (payment_status = 'Confirmed' AND application_status = ANY (ARRAY['Frais Réglés'::application_status_enum, 'Dossier Créé'::application_status_enum]))
      -- Conditional-resubmission escape hatch
      OR (payment_status = 'paid' AND application_status = 'en_cours_devaluation')
    )
  );


