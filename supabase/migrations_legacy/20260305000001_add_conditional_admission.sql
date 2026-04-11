-- Migration: Add admission_conditionnelle status and conditional_message column
-- Purpose: Support the "Conditional Admission Loop" where an admin can request
--          additional documents from an applicant without issuing a final decision.

-- 1. Add new enum value
ALTER TYPE application_status_enum ADD VALUE IF NOT EXISTS 'admission_conditionnelle';

-- 2. Add conditional_message column (nullable — only populated for conditional status)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS conditional_message TEXT NULL;

-- 3. Extend uploaded_documents document_type check to include conditional uploads
ALTER TABLE uploaded_documents DROP CONSTRAINT IF EXISTS uploaded_documents_document_type_check;
ALTER TABLE uploaded_documents ADD CONSTRAINT uploaded_documents_document_type_check
  CHECK (document_type = ANY (ARRAY[
    'identification', 'diploma', 'bulletin_10', 'bulletin_11', 'bulletin_12',
    'other', 'document_conditionnel'
  ]));

-- 4. Index for dashboard query (quickly find conditional apps)
CREATE INDEX IF NOT EXISTS idx_applications_conditional
  ON applications (application_status)
  WHERE application_status = 'admission_conditionnelle';

-- 4. Update applicant's own-update RLS to allow the resubmission transition
--    (admission_conditionnelle → en_cours_devaluation).
DROP POLICY IF EXISTS applications_update_own ON applications;

CREATE POLICY applications_update_own ON applications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() AND (
      -- Normal pre-payment editing
      (payment_status NOT IN ('Confirmed', 'paid') AND application_status = 'Dossier Créé')
      -- Legacy Confirmed path
      OR (payment_status = 'Confirmed' AND application_status = ANY (ARRAY['Frais Réglés'::application_status_enum, 'Dossier Créé'::application_status_enum]))
      -- Conditional-resubmission escape hatch
      OR (payment_status = 'paid' AND application_status = 'en_cours_devaluation')
    )
  );
