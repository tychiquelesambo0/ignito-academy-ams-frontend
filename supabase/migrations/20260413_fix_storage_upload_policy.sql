-- ============================================================================
-- Migration: 20260413_fix_storage_upload_policy.sql
-- Allow document uploads BEFORE payment confirmation.
-- The old INSERT policy required payment_status IN ('Confirmed', 'Waived'),
-- which contradicts our new flow: Documents → Payment.
-- Business-logic locking (after payment) is enforced in the API route.
-- ============================================================================

-- Drop the old payment-gated INSERT policy
DROP POLICY IF EXISTS "Applicants can upload documents after payment" ON storage.objects;

-- New policy: uploads are allowed when the applicant has an active application
-- (not rejected).  The API layer handles all further business-logic checks.
CREATE POLICY "Applicants can upload own documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pieces_justificatives' AND
    -- Path must start with the applicant's intake year
    (storage.foldername(name))[1] = (
      SELECT intake_year::TEXT FROM applications
      WHERE user_id = auth.uid()
      LIMIT 1
    ) AND
    -- Second path segment must match the applicant's own IGN-XXXX-XXXXX id
    (storage.foldername(name))[2] = (
      SELECT applicant_id FROM applications
      WHERE user_id = auth.uid()
      LIMIT 1
    ) AND
    -- Application must exist and not be rejected
    EXISTS (
      SELECT 1 FROM applications
      WHERE user_id    = auth.uid()
        AND application_status != 'Dossier refusé'
    )
  );
