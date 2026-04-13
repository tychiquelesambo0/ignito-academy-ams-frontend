-- ============================================================================
-- Migration: 20260413101002_documents_before_payment.sql
-- Re-order the applicant journey: Documents → Payment (not Payment → Documents)
-- ============================================================================

-- 1. Track whether the applicant has submitted their documents.
--    The documents page will set this to TRUE before payment is unlocked.
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS documents_submitted BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN applications.documents_submitted IS
  'Set to TRUE by the applicant when they finish uploading their required documents.
   This gates access to the Payment step.';

-- 2. Fix the uploaded_documents INSERT policy.
--    The original policy required payment_status IN (''Confirmed'', ''Waived''),
--    which made it impossible to upload before paying.
--    New rule: uploads are allowed as long as the application is not rejected.
DROP POLICY IF EXISTS uploaded_documents_insert_own ON uploaded_documents;

CREATE POLICY uploaded_documents_insert_own
  ON uploaded_documents FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.user_id         = auth.uid()
        AND applications.applicant_id    = uploaded_documents.applicant_id
        AND applications.application_status != 'Dossier refusé'
    )
  );
