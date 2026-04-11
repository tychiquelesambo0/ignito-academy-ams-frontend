-- ============================================================================
-- IGNITO ACADEMY AMS — FRESH DATABASE SCHEMA
-- ============================================================================
-- Migration: 20260410000001_fresh_ams_schema.sql
-- Created: 2026-04-10
-- Description: Brand new database schema implementing four architectural pillars
-- 
-- CRITICAL ARCHITECTURAL PILLARS:
-- 1. USD Single-Currency: No CDF, no exchange rates
-- 2. Keyword Ban: No references to prohibited keywords
-- 3. Supabase Auth ONLY: No manual password hashing
-- 4. Video URLs Only: YouTube/Vimeo links, no video file uploads
-- ============================================================================

-- Drop existing tables if this is a fresh rebuild
-- (Comment out if you want to preserve existing data)
DROP TABLE IF EXISTS refund_transactions CASCADE;
DROP TABLE IF EXISTS audit_trail CASCADE;
DROP TABLE IF EXISTS uploaded_documents CASCADE;
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS webhook_logs CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS applicant_id_sequences CASCADE;
DROP TABLE IF EXISTS applicants CASCADE;
DROP TABLE IF EXISTS admissions_officers CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS application_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS exam_status CASCADE;
DROP TYPE IF EXISTS scholarship_status CASCADE;

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE application_status AS ENUM (
  'Dossier Créé',
  'Frais Réglés',
  'En cours d''évaluation',
  'Admission sous réserve',
  'Admission définitive',
  'Dossier refusé'
);

CREATE TYPE payment_status AS ENUM (
  'Pending',
  'Confirmed',
  'Failed',
  'Refunded',
  'Waived'
);

CREATE TYPE exam_status AS ENUM (
  'Réussi',
  'En attente',
  'Échoué'
);

CREATE TYPE scholarship_status AS ENUM (
  'pending',
  'video_submitted',
  'test_invited',
  'interview_invited',
  'awarded',
  'rejected'
);

-- ============================================================================
-- TABLE: applicants
-- ============================================================================
-- Stores applicant profile information
-- Linked to Supabase Auth via id = auth.uid()

CREATE TABLE applicants (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal Information
  prenom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  date_naissance DATE NOT NULL,
  lieu_naissance VARCHAR(255),
  sexe VARCHAR(10),
  nationalite VARCHAR(100),
  
  -- Address
  adresse_complete TEXT,
  ville VARCHAR(100),
  province VARCHAR(100),
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_sexe CHECK (sexe IN ('Masculin', 'Féminin', 'Autre')),
  CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT chk_phone_e164 CHECK (phone_number ~* '^\+[1-9]\d{1,14}$')
);

COMMENT ON TABLE applicants IS 'Applicant profiles linked to Supabase Auth';
COMMENT ON COLUMN applicants.id IS 'References auth.users(id) - Supabase Auth ONLY';
COMMENT ON COLUMN applicants.phone_number IS 'E.164 format: +243XXXXXXXXX';

-- ============================================================================
-- TABLE: applicant_id_sequences
-- ============================================================================
-- Atomic sequence generation for Applicant_ID (IGN-YYYY-XXXXX)

CREATE TABLE applicant_id_sequences (
  intake_year INTEGER PRIMARY KEY,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_intake_year CHECK (intake_year >= 2024 AND intake_year <= 2100),
  CONSTRAINT chk_sequence_positive CHECK (last_sequence >= 0)
);

COMMENT ON TABLE applicant_id_sequences IS 'Atomic sequence for Applicant_ID generation';

-- ============================================================================
-- TABLE: admissions_officers
-- ============================================================================
-- Admin users for application review
-- MUST be created BEFORE applications table (foreign key dependency)

CREATE TABLE admissions_officers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  prenom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  role VARCHAR(50) DEFAULT 'officer',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_role CHECK (role IN ('officer', 'senior_officer', 'admin'))
);

COMMENT ON TABLE admissions_officers IS 'Admissions officers linked to Supabase Auth';

-- ============================================================================
-- TABLE: applications
-- ============================================================================
-- Main application table with scholarship and payment tracking

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id VARCHAR(20) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  intake_year INTEGER NOT NULL,
  
  -- Academic Background
  ecole_provenance VARCHAR(255),
  option_academique VARCHAR(255),
  exam_status exam_status DEFAULT 'En attente',
  
  -- Scholarship Fields (NEW)
  grade_10_average NUMERIC(5,2),
  grade_11_average NUMERIC(5,2),
  grade_12_average NUMERIC(5,2),
  exetat_percentage NUMERIC(5,2),
  graduation_year SMALLINT,
  is_scholarship_eligible BOOLEAN DEFAULT FALSE,
  scholarship_status scholarship_status DEFAULT 'pending',
  scholarship_video_url TEXT, -- YouTube/Vimeo URL ONLY (no file uploads)
  scholarship_awarded_at TIMESTAMPTZ,
  scholarship_awarded_by UUID REFERENCES admissions_officers(id),
  
  -- English Proficiency (for Intensive English program, NOT scholarship eligibility)
  english_proficiency_level TEXT,
  
  -- Application Status
  application_status application_status DEFAULT 'Dossier Créé',
  
  -- Payment Tracking (USD ONLY)
  payment_status payment_status DEFAULT 'Pending',
  payment_currency TEXT NOT NULL DEFAULT 'USD',
  payment_amount_paid NUMERIC(10,2),
  transaction_id VARCHAR(100),
  payment_confirmed_at TIMESTAMPTZ,
  
  -- Optimistic Locking
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_applicant_id_format CHECK (applicant_id ~* '^IGN-\d{4}-\d{5}$'),
  CONSTRAINT chk_intake_year CHECK (intake_year >= 2024 AND intake_year <= 2100),
  
  -- CRITICAL: USD single-currency enforcement
  CONSTRAINT chk_payment_currency CHECK (payment_currency = 'USD'),
  CONSTRAINT chk_payment_amount CHECK (payment_amount_paid IS NULL OR payment_amount_paid > 0),
  
  -- Grade validation (0-100 range)
  CONSTRAINT chk_grade_10_range CHECK (grade_10_average IS NULL OR (grade_10_average >= 0 AND grade_10_average <= 100)),
  CONSTRAINT chk_grade_11_range CHECK (grade_11_average IS NULL OR (grade_11_average >= 0 AND grade_11_average <= 100)),
  CONSTRAINT chk_grade_12_range CHECK (grade_12_average IS NULL OR (grade_12_average >= 0 AND grade_12_average <= 100)),
  CONSTRAINT chk_exetat_range CHECK (exetat_percentage IS NULL OR (exetat_percentage >= 0 AND exetat_percentage <= 100)),
  
  -- Graduation year validation
  CONSTRAINT chk_graduation_year CHECK (graduation_year IS NULL OR graduation_year >= 2024),
  
  -- English proficiency levels (CEFR standard)
  CONSTRAINT chk_english_level CHECK (
    english_proficiency_level IS NULL OR 
    english_proficiency_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')
  ),
  
  -- Scholarship status workflow
  CONSTRAINT chk_scholarship_status CHECK (
    scholarship_status IN ('pending', 'video_submitted', 'test_invited', 
                          'interview_invited', 'awarded', 'rejected')
  ),
  
  -- Video URL validation (YouTube/Vimeo only, NO file uploads)
  CONSTRAINT chk_video_url_format CHECK (
    scholarship_video_url IS NULL OR
    scholarship_video_url ~* '^https?://(www\.)?(youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/|vimeo\.com/)\S+$'
  )
);

COMMENT ON TABLE applications IS 'Main application table - USD single-currency only';
COMMENT ON COLUMN applications.payment_currency IS 'Always USD - single currency architecture';
COMMENT ON COLUMN applications.scholarship_video_url IS 'YouTube/Vimeo URL ONLY - no video file uploads';
COMMENT ON COLUMN applications.english_proficiency_level IS 'For Intensive English program - NOT scholarship eligibility';

-- Indexes
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_applicant_id ON applications(applicant_id);
CREATE INDEX idx_applications_intake_year ON applications(intake_year);
CREATE INDEX idx_applications_payment_status ON applications(payment_status);
CREATE INDEX idx_applications_application_status ON applications(application_status);
CREATE INDEX idx_applications_scholarship_eligible ON applications(is_scholarship_eligible) WHERE is_scholarship_eligible = TRUE;
CREATE INDEX idx_applications_scholarship_status ON applications(scholarship_status);
CREATE INDEX idx_applications_created_at ON applications(created_at DESC);

-- ============================================================================
-- TABLE: uploaded_documents
-- ============================================================================
-- Track document uploads (PDFs and images ONLY, NO video files)

CREATE TABLE uploaded_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id VARCHAR(20) NOT NULL,
  user_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  
  -- Document metadata
  document_type VARCHAR(100) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  
  -- Audit
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_file_size CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880), -- 5MB max
  CONSTRAINT chk_mime_type CHECK (
    mime_type IN (
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png'
    )
  ),
  CONSTRAINT chk_document_type CHECK (
    document_type IN (
      'Bulletin 10ème',
      'Bulletin 11ème',
      'Bulletin 12ème',
      'Diplôme d''État',
      'Carte d''identité',
      'Photo d''identité',
      'Autre'
    )
  )
);

COMMENT ON TABLE uploaded_documents IS 'Document uploads - PDFs and images ONLY (no video files)';
COMMENT ON COLUMN uploaded_documents.mime_type IS 'PDF, JPEG, PNG only - NO video MIME types';

CREATE INDEX idx_uploaded_documents_applicant_id ON uploaded_documents(applicant_id);
CREATE INDEX idx_uploaded_documents_user_id ON uploaded_documents(user_id);
CREATE INDEX idx_uploaded_documents_uploaded_at ON uploaded_documents(uploaded_at DESC);

-- ============================================================================
-- TABLE: email_logs
-- ============================================================================
-- Track all email communications

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id VARCHAR(20),
  recipient_email VARCHAR(255) NOT NULL,
  email_type VARCHAR(100) NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_email_type CHECK (
    email_type IN (
      'payment_confirmation',
      'conditional_acceptance',
      'final_acceptance',
      'rejection',
      'scholarship_test_invitation',
      'scholarship_interview_invitation',
      'scholarship_award',
      'scholarship_rejection'
    )
  ),
  CONSTRAINT chk_status CHECK (status IN ('pending', 'sent', 'failed')),
  CONSTRAINT chk_retry_count CHECK (retry_count >= 0 AND retry_count <= 10)
);

COMMENT ON TABLE email_logs IS 'Email communication audit trail';

CREATE INDEX idx_email_logs_applicant_id ON email_logs(applicant_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);

-- ============================================================================
-- TABLE: webhook_logs
-- ============================================================================
-- Track payment webhook receipts (idempotency)

CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(100) NOT NULL UNIQUE,
  applicant_id VARCHAR(20),
  status VARCHAR(50) NOT NULL,
  amount NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  provider VARCHAR(50),
  payload JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- CRITICAL: USD single-currency constraint
  CONSTRAINT chk_webhook_currency CHECK (currency = 'USD'),
  CONSTRAINT chk_webhook_status CHECK (status IN ('success', 'failed', 'pending'))
);

COMMENT ON TABLE webhook_logs IS 'Payment webhook audit trail - USD only';
COMMENT ON COLUMN webhook_logs.currency IS 'Always USD - single currency architecture';

CREATE INDEX idx_webhook_logs_transaction_id ON webhook_logs(transaction_id);
CREATE INDEX idx_webhook_logs_applicant_id ON webhook_logs(applicant_id);
CREATE INDEX idx_webhook_logs_received_at ON webhook_logs(received_at DESC);

-- ============================================================================
-- TABLE: audit_trail
-- ============================================================================
-- Immutable audit log for admin actions

CREATE TABLE audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id VARCHAR(20) NOT NULL,
  admin_id UUID NOT NULL REFERENCES admissions_officers(id),
  previous_status application_status,
  new_status application_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_trail IS 'Immutable audit trail for admin decisions';

CREATE INDEX idx_audit_trail_applicant_id ON audit_trail(applicant_id);
CREATE INDEX idx_audit_trail_admin_id ON audit_trail(admin_id);
CREATE INDEX idx_audit_trail_created_at ON audit_trail(created_at DESC);

-- ============================================================================
-- TABLE: refund_transactions
-- ============================================================================
-- Track refund operations (USD only)

CREATE TABLE refund_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id VARCHAR(20) NOT NULL,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES admissions_officers(id),
  
  -- Refund details (USD only)
  original_transaction_id VARCHAR(100) NOT NULL,
  refund_transaction_id VARCHAR(100) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  reason TEXT NOT NULL,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- CRITICAL: USD single-currency constraint
  CONSTRAINT chk_refund_currency CHECK (currency = 'USD'),
  CONSTRAINT chk_refund_status CHECK (status IN ('pending', 'completed', 'failed')),
  CONSTRAINT chk_refund_amount CHECK (amount > 0)
);

COMMENT ON TABLE refund_transactions IS 'Refund tracking - USD single-currency only';
COMMENT ON COLUMN refund_transactions.currency IS 'Always USD - single currency architecture';

CREATE INDEX idx_refund_transactions_applicant_id ON refund_transactions(applicant_id);
CREATE INDEX idx_refund_transactions_admin_id ON refund_transactions(admin_id);
CREATE INDEX idx_refund_transactions_status ON refund_transactions(status);

-- ============================================================================
-- DATABASE FUNCTIONS
-- ============================================================================

-- Function: Generate Applicant ID (IGN-YYYY-XXXXX)
CREATE OR REPLACE FUNCTION generate_applicant_id(p_intake_year INTEGER)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sequence INTEGER;
  v_applicant_id VARCHAR(20);
BEGIN
  -- Atomic sequence increment with row-level locking
  INSERT INTO applicant_id_sequences (intake_year, last_sequence)
  VALUES (p_intake_year, 1)
  ON CONFLICT (intake_year) DO UPDATE
  SET last_sequence = applicant_id_sequences.last_sequence + 1,
      updated_at = NOW()
  RETURNING last_sequence INTO v_sequence;
  
  -- Format: IGN-2026-00001
  v_applicant_id := 'IGN-' || p_intake_year || '-' || LPAD(v_sequence::TEXT, 5, '0');
  
  RETURN v_applicant_id;
END;
$$;

COMMENT ON FUNCTION generate_applicant_id IS 'Atomic Applicant_ID generation with row-level locking';

-- Function: Update application status with optimistic locking
CREATE OR REPLACE FUNCTION update_application_status_with_version_check(
  p_applicant_id VARCHAR(20),
  p_new_status application_status,
  p_expected_version INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows_updated INTEGER;
BEGIN
  -- Atomic update with version check
  UPDATE applications
  SET application_status = p_new_status,
      version = version + 1,
      updated_at = NOW()
  WHERE applicant_id = p_applicant_id
    AND version = p_expected_version;
  
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  
  RETURN v_rows_updated = 1;
END;
$$;

COMMENT ON FUNCTION update_application_status_with_version_check IS 'Optimistic locking for concurrent edits';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_applicants_updated_at
  BEFORE UPDATE ON applicants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admissions_officers_updated_at
  BEFORE UPDATE ON admissions_officers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applicant_id_sequences_updated_at
  BEFORE UPDATE ON applicant_id_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refund_transactions_updated_at
  BEFORE UPDATE ON refund_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Seed intake year sequence
INSERT INTO applicant_id_sequences (intake_year, last_sequence)
VALUES (2026, 0)
ON CONFLICT (intake_year) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON SCHEMA public IS 'Ignito Academy AMS - Fresh schema implementing four architectural pillars';
