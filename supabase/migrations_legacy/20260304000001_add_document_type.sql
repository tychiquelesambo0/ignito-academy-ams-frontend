-- Add document_type column to uploaded_documents table
-- Required document types: identification, diploma, bulletin_10, bulletin_11, bulletin_12

ALTER TABLE uploaded_documents
  ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'other'
    CHECK (document_type IN (
      'identification',
      'diploma',
      'bulletin_10',
      'bulletin_11',
      'bulletin_12',
      'other'
    ));

-- Index for fast lookup by applicant + type
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_type
  ON uploaded_documents(applicant_id, document_type);

-- Allow applicants to delete their own documents (e.g. to replace them)
CREATE POLICY uploaded_documents_delete_own
  ON uploaded_documents FOR DELETE
  USING (user_id = auth.uid());
