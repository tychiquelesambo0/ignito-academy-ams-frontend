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
