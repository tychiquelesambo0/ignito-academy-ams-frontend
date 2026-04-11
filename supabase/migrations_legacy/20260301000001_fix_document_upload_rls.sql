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
