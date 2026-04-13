-- ============================================================================
-- Migration: 20260413_fix_graduation_year_constraint.sql
-- Remove the 2024 floor on graduation_year.
-- The year-2024 threshold is a scholarship eligibility filter, not an
-- application requirement.  Applicants who graduated before 2024 must
-- still be able to submit their dossier.
-- ============================================================================

ALTER TABLE applications
  DROP CONSTRAINT IF EXISTS chk_graduation_year;

ALTER TABLE applications
  ADD CONSTRAINT chk_graduation_year
    CHECK (graduation_year IS NULL OR (graduation_year >= 2000 AND graduation_year <= 2100));
