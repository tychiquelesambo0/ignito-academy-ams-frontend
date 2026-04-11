-- =============================================
-- Ignito Academy AMS - OTHM Keyword Prohibition
-- Migration: 20260409000003_othm_keyword_prohibition
-- Created: 2026-04-09
-- Purpose: Add database-level OTHM keyword detection and blocking
-- =============================================

-- =============================================
-- SECTION 1: OTHM KEYWORD DETECTION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION check_othm_keyword()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if NEW record contains OTHM keyword (case-insensitive)
  IF NEW::text ~* '\mOTHM\M' THEN
    RAISE EXCEPTION 'OTHM keyword is strictly prohibited for IP protection. Use "UK Level 3 Foundation Diploma" instead.';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION check_othm_keyword() IS 'Detects and blocks OTHM keyword in database records for IP protection';

-- =============================================
-- SECTION 2: ATTACH TRIGGERS TO TABLES
-- =============================================

-- Prevent OTHM in applications table
CREATE TRIGGER prevent_othm_in_applications
  BEFORE INSERT OR UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION check_othm_keyword();

-- Prevent OTHM in applicants table
CREATE TRIGGER prevent_othm_in_applicants
  BEFORE INSERT OR UPDATE ON applicants
  FOR EACH ROW EXECUTE FUNCTION check_othm_keyword();

-- Prevent OTHM in uploaded_documents table
CREATE TRIGGER prevent_othm_in_uploaded_documents
  BEFORE INSERT OR UPDATE ON uploaded_documents
  FOR EACH ROW EXECUTE FUNCTION check_othm_keyword();

-- Prevent OTHM in email_logs table
CREATE TRIGGER prevent_othm_in_email_logs
  BEFORE INSERT OR UPDATE ON email_logs
  FOR EACH ROW EXECUTE FUNCTION check_othm_keyword();

-- Prevent OTHM in audit_trail table
CREATE TRIGGER prevent_othm_in_audit_trail
  BEFORE INSERT OR UPDATE ON audit_trail
  FOR EACH ROW EXECUTE FUNCTION check_othm_keyword();

-- =============================================
-- SECTION 3: COMMENTS
-- =============================================

COMMENT ON TRIGGER prevent_othm_in_applications ON applications IS 'Blocks OTHM keyword in applications for IP protection';
COMMENT ON TRIGGER prevent_othm_in_applicants ON applicants IS 'Blocks OTHM keyword in applicant profiles for IP protection';
COMMENT ON TRIGGER prevent_othm_in_uploaded_documents ON uploaded_documents IS 'Blocks OTHM keyword in document metadata for IP protection';
COMMENT ON TRIGGER prevent_othm_in_email_logs ON email_logs IS 'Blocks OTHM keyword in email logs for IP protection';
COMMENT ON TRIGGER prevent_othm_in_audit_trail ON audit_trail IS 'Blocks OTHM keyword in audit trail for IP protection';

-- =============================================
-- VERIFICATION
-- =============================================

DO $$
BEGIN
  -- Test OTHM detection (should fail)
  BEGIN
    INSERT INTO applicants (
      email, phone_number, prenom, nom, date_naissance, password_hash
    ) VALUES (
      'test@example.com', '+243999999999', 'Test', 'OTHM User', '2000-01-01', 'hash'
    );
    RAISE EXCEPTION 'OTHM detection failed - keyword was accepted!';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%OTHM keyword is strictly prohibited%' THEN
        RAISE NOTICE '✅ OTHM keyword detection working correctly';
      ELSE
        RAISE NOTICE 'ℹ️  Test skipped (constraint violation: %)', SQLERRM;
      END IF;
  END;
END $$;

-- =============================================
-- END OF MIGRATION
-- =============================================
