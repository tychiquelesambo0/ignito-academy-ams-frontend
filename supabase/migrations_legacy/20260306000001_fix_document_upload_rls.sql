-- Fix document upload RLS policies
-- Bug: uploaded_documents_insert_own required payment_status = 'Confirmed'
--      which blocked ALL uploads before payment — the opposite of the intended flow.
-- Fix: allow uploads whenever the application belongs to the authenticated user.
--      The payment lock is enforced at the application layer (upload route).

-- 1. Fix INSERT policy (remove the incorrect payment_status = 'Confirmed' gate)
DROP POLICY IF EXISTS uploaded_documents_insert_own ON uploaded_documents;

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

-- 2. Add DELETE policy (was missing — applicants could not delete their own docs)
DROP POLICY IF EXISTS uploaded_documents_delete_own ON uploaded_documents;

CREATE POLICY uploaded_documents_delete_own
  ON uploaded_documents FOR DELETE
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.applicant_id = uploaded_documents.applicant_id
        AND applications.user_id = auth.uid()
        AND applications.payment_status NOT IN ('Confirmed', 'paid')
    )
  );

COMMENT ON POLICY uploaded_documents_insert_own ON uploaded_documents
  IS 'Applicants can upload documents to their own application before payment is confirmed';
COMMENT ON POLICY uploaded_documents_delete_own ON uploaded_documents
  IS 'Applicants can delete their own documents before payment is confirmed';
