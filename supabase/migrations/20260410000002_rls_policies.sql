-- ============================================================================
-- IGNITO ACADEMY AMS — ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Migration: 20260410000002_rls_policies.sql
-- Created: 2026-04-10
-- Description: Comprehensive RLS policies for all tables
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admissions_officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicant_id_sequences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- APPLICANTS TABLE POLICIES
-- ============================================================================

-- Applicants can read their own profile
CREATE POLICY applicants_select_own
  ON applicants FOR SELECT
  USING (auth.uid() = id);

-- Applicants can insert their own profile (during registration)
CREATE POLICY applicants_insert_own
  ON applicants FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Applicants can update their own profile
CREATE POLICY applicants_update_own
  ON applicants FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admissions officers can read all applicants
CREATE POLICY applicants_select_admin
  ON applicants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- ============================================================================
-- APPLICATIONS TABLE POLICIES
-- ============================================================================

-- Applicants can read their own applications
CREATE POLICY applications_select_own
  ON applications FOR SELECT
  USING (auth.uid() = user_id);

-- Applicants can insert their own applications
CREATE POLICY applications_insert_own
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Applicants can update their own applications (before payment confirmed)
CREATE POLICY applications_update_own
  ON applications FOR UPDATE
  USING (
    auth.uid() = user_id AND
    payment_status IN ('Pending', 'Failed')
  )
  WITH CHECK (
    auth.uid() = user_id AND
    payment_status IN ('Pending', 'Failed')
  );

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

-- ============================================================================
-- ADMISSIONS OFFICERS TABLE POLICIES
-- ============================================================================

-- Admissions officers can read all officers
CREATE POLICY admissions_officers_select_admin
  ON admissions_officers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- Only active admins can insert new officers
CREATE POLICY admissions_officers_insert_admin
  ON admissions_officers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE AND role = 'admin'
    )
  );

-- Only active admins can update officers
CREATE POLICY admissions_officers_update_admin
  ON admissions_officers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE AND role = 'admin'
    )
  );

-- ============================================================================
-- UPLOADED DOCUMENTS TABLE POLICIES
-- ============================================================================

-- Applicants can read their own documents
CREATE POLICY uploaded_documents_select_own
  ON uploaded_documents FOR SELECT
  USING (auth.uid() = user_id);

-- CRITICAL: Applicants can insert documents ONLY if payment is Confirmed or Waived
CREATE POLICY uploaded_documents_insert_own
  ON uploaded_documents FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.user_id = auth.uid()
        AND applications.applicant_id = uploaded_documents.applicant_id
        AND applications.payment_status IN ('Confirmed', 'Waived')
    )
  );

-- Applicants can delete their own documents (before submission)
CREATE POLICY uploaded_documents_delete_own
  ON uploaded_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Admissions officers can read all documents
CREATE POLICY uploaded_documents_select_admin
  ON uploaded_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- ============================================================================
-- EMAIL LOGS TABLE POLICIES
-- ============================================================================

-- Admissions officers can read all email logs
CREATE POLICY email_logs_select_admin
  ON email_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- System can insert email logs (service role)
CREATE POLICY email_logs_insert_system
  ON email_logs FOR INSERT
  WITH CHECK (TRUE);

-- System can update email logs (service role)
CREATE POLICY email_logs_update_system
  ON email_logs FOR UPDATE
  USING (TRUE)
  WITH CHECK (TRUE);

-- ============================================================================
-- WEBHOOK LOGS TABLE POLICIES
-- ============================================================================

-- Admissions officers can read webhook logs
CREATE POLICY webhook_logs_select_admin
  ON webhook_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- System can insert webhook logs (service role)
CREATE POLICY webhook_logs_insert_system
  ON webhook_logs FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================================
-- AUDIT TRAIL TABLE POLICIES
-- ============================================================================

-- Admissions officers can read audit trail
CREATE POLICY audit_trail_select_admin
  ON audit_trail FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- Admissions officers can insert audit records
CREATE POLICY audit_trail_insert_admin
  ON audit_trail FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- ============================================================================
-- REFUND TRANSACTIONS TABLE POLICIES
-- ============================================================================

-- Admissions officers can read refund transactions
CREATE POLICY refund_transactions_select_admin
  ON refund_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- Admissions officers can insert refund transactions
CREATE POLICY refund_transactions_insert_admin
  ON refund_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- Admissions officers can update refund status
CREATE POLICY refund_transactions_update_admin
  ON refund_transactions FOR UPDATE
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

-- ============================================================================
-- APPLICANT ID SEQUENCES TABLE POLICIES
-- ============================================================================

-- System can read sequences (service role)
CREATE POLICY applicant_id_sequences_select_system
  ON applicant_id_sequences FOR SELECT
  USING (TRUE);

-- System can insert/update sequences (service role)
CREATE POLICY applicant_id_sequences_insert_system
  ON applicant_id_sequences FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY applicant_id_sequences_update_system
  ON applicant_id_sequences FOR UPDATE
  USING (TRUE)
  WITH CHECK (TRUE);

-- Admissions officers can read sequences
CREATE POLICY applicant_id_sequences_select_admin
  ON applicant_id_sequences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- ============================================================================
-- RLS POLICIES COMPLETE
-- ============================================================================

COMMENT ON SCHEMA public IS 'RLS policies enforce data access control at database level';
