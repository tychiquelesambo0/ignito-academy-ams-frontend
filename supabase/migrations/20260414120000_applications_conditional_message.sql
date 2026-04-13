-- ============================================================================
-- applications.conditional_message
-- Used by admin « demande de pièce complémentaire » and admission sous réserve.
-- Missing from fresh_ams_schema applications DDL — required for /api/admin/request-document.
-- ============================================================================

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS conditional_message TEXT;

COMMENT ON COLUMN applications.conditional_message IS
  'Message affiché au candidat (demande de pièces complémentaires, conditions d''admission sous réserve, etc.).';
