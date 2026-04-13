-- ============================================================================
-- IGNITO ACADEMY AMS — FIX RLS POLICIES (Remove Infinite Recursion)
-- ============================================================================
-- Migration: 20260410000006_fix_rls_policies.sql
-- Created: 2026-04-10
-- Description: Fix infinite recursion in admissions_officers RLS policies
-- ============================================================================

-- ============================================================================
-- ADMISSIONS OFFICERS TABLE POLICIES (Fixed)
-- ============================================================================
-- Idempotent: policies may already exist on remotes that partially ran earlier migrations.

DROP POLICY IF EXISTS admissions_officers_select_own ON admissions_officers;
DROP POLICY IF EXISTS admissions_officers_insert_admin ON admissions_officers;
DROP POLICY IF EXISTS admissions_officers_update_admin ON admissions_officers;

-- Officers can read their own record (no recursion)
CREATE POLICY admissions_officers_select_own
  ON admissions_officers FOR SELECT
  USING (auth.uid() = id);

-- Only existing active admins can insert new officers
-- Use a subquery that doesn't trigger RLS
CREATE POLICY admissions_officers_insert_admin
  ON admissions_officers FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM admissions_officers 
      WHERE is_active = TRUE AND role = 'admin'
    )
  );

-- Only existing active admins can update officers
CREATE POLICY admissions_officers_update_admin
  ON admissions_officers FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM admissions_officers 
      WHERE is_active = TRUE AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM admissions_officers 
      WHERE is_active = TRUE AND role = 'admin'
    )
  );

-- ============================================================================
-- RE-ADD ADMIN POLICIES FOR OTHER TABLES
-- ============================================================================

DROP POLICY IF EXISTS applicants_select_admin ON applicants;
DROP POLICY IF EXISTS applications_select_admin ON applications;
DROP POLICY IF EXISTS applications_update_admin ON applications;

-- Admissions officers can read all applicants
CREATE POLICY applicants_select_admin
  ON applicants FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM admissions_officers
      WHERE is_active = TRUE
    )
  );

-- Admissions officers can read all applications
CREATE POLICY applications_select_admin
  ON applications FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM admissions_officers
      WHERE is_active = TRUE
    )
  );

-- Admissions officers can update application status
CREATE POLICY applications_update_admin
  ON applications FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM admissions_officers
      WHERE is_active = TRUE
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM admissions_officers
      WHERE is_active = TRUE
    )
  );

-- Comment
COMMENT ON POLICY admissions_officers_select_own ON admissions_officers IS 'Officers can read their own record without recursion';
