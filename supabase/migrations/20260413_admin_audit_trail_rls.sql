-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: audit_trail RLS — allow officers to read & write their own entries
-- ─────────────────────────────────────────────────────────────────────────────

-- Officers need to SELECT from audit_trail to display the activity log
-- (the applicants_select_admin-style check avoids circular dependency)
DROP POLICY IF EXISTS audit_trail_select_admin ON audit_trail;

CREATE POLICY audit_trail_select_admin
  ON audit_trail FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM admissions_officers WHERE is_active = TRUE
    )
  );

-- Officers need to INSERT into audit_trail to log decisions
DROP POLICY IF EXISTS audit_trail_insert_admin ON audit_trail;

CREATE POLICY audit_trail_insert_admin
  ON audit_trail FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM admissions_officers WHERE is_active = TRUE
    )
  );

-- Allow the audit_trail to JOIN admissions_officers for officer name display
-- (already covered by admissions_officers_select_own policy)
