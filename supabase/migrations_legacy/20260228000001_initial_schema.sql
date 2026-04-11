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
