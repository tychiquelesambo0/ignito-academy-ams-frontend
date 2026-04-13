-- ============================================================================
-- Migration: 20260413101000_add_profile_fields.sql
-- Add postnom (middle name), commune, and code_postal to applicants table
-- ============================================================================

ALTER TABLE applicants
  ADD COLUMN IF NOT EXISTS postnom     VARCHAR(100),        -- optional middle name (common in DRC)
  ADD COLUMN IF NOT EXISTS commune     VARCHAR(100),        -- suburb / commune (required for full address)
  ADD COLUMN IF NOT EXISTS code_postal VARCHAR(20);         -- optional postal code

COMMENT ON COLUMN applicants.postnom     IS 'Middle name — optional, culturally standard in DRC';
COMMENT ON COLUMN applicants.commune     IS 'Commune / quartier (suburb within a city)';
COMMENT ON COLUMN applicants.code_postal IS 'Postal code — optional';
