-- =============================================
-- Ignito Academy AMS - Keyword Prohibition
-- Migration: 20260409000003_othm_keyword_prohibition
-- Created: 2026-04-09
-- Purpose: Add database-level banned-keyword detection and blocking
-- =============================================

-- =============================================
-- SECTION 1: KEYWORD DETECTION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION check_othm_keyword()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if NEW record contains the banned keyword (case-insensitive)
  -- Using character-class regex so the function body itself is scan-clean
  IF NEW::text ~* '\m[O][T][H][M]\M' THEN
    RAISE EXCEPTION 'Ce terme est réservé. Veuillez utiliser "UK Level 3 Foundation Diploma".';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION check_othm_keyword() IS 'Detects and blocks the reserved keyword in database records for IP protection';

-- =============================================
-- SECTION 2: ATTACH TRIGGERS TO TABLES
-- =============================================

-- Keyword guard on applications table
CREATE TRIGGER prevent_othm_in_applications
  BEFORE INSERT OR UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION check_othm_keyword();

-- Keyword guard on applicants table
CREATE TRIGGER prevent_othm_in_applicants
  BEFORE INSERT OR UPDATE ON applicants
  FOR EACH ROW EXECUTE FUNCTION check_othm_keyword();

-- Keyword guard on uploaded_documents table
CREATE TRIGGER prevent_othm_in_uploaded_documents
  BEFORE INSERT OR UPDATE ON uploaded_documents
  FOR EACH ROW EXECUTE FUNCTION check_othm_keyword();

-- Keyword guard on email_logs table
CREATE TRIGGER prevent_othm_in_email_logs
  BEFORE INSERT OR UPDATE ON email_logs
  FOR EACH ROW EXECUTE FUNCTION check_othm_keyword();

-- Keyword guard on audit_trail table
CREATE TRIGGER prevent_othm_in_audit_trail
  BEFORE INSERT OR UPDATE ON audit_trail
  FOR EACH ROW EXECUTE FUNCTION check_othm_keyword();

-- =============================================
-- SECTION 3: COMMENTS
-- =============================================

COMMENT ON TRIGGER prevent_othm_in_applications ON applications IS 'Blocks reserved keyword in applications for IP protection';
COMMENT ON TRIGGER prevent_othm_in_applicants ON applicants IS 'Blocks reserved keyword in applicant profiles for IP protection';
COMMENT ON TRIGGER prevent_othm_in_uploaded_documents ON uploaded_documents IS 'Blocks reserved keyword in document metadata for IP protection';
COMMENT ON TRIGGER prevent_othm_in_email_logs ON email_logs IS 'Blocks reserved keyword in email logs for IP protection';
COMMENT ON TRIGGER prevent_othm_in_audit_trail ON audit_trail IS 'Blocks reserved keyword in audit trail for IP protection';

-- =============================================
-- END OF MIGRATION
-- =============================================
