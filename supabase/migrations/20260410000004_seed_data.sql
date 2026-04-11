-- ============================================================================
-- IGNITO ACADEMY AMS — SEED DATA
-- ============================================================================
-- Migration: 20260410000004_seed_data.sql
-- Created: 2026-04-10
-- Description: Seed initial data for development and testing
-- ============================================================================

-- ============================================================================
-- SEED: Intake Year Sequences
-- ============================================================================

INSERT INTO applicant_id_sequences (intake_year, last_sequence)
VALUES 
  (2024, 0),
  (2025, 0),
  (2026, 0),
  (2027, 0)
ON CONFLICT (intake_year) DO NOTHING;

-- ============================================================================
-- SEED: Test Admin Account
-- ============================================================================
-- NOTE: Admin user must be created manually via Supabase Dashboard
--
-- Steps to create test admin:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add user"
-- 3. Email: admin@ignitoacademy.com
-- 4. Password: (generate strong password)
-- 5. Auto-confirm user: ✅
-- 6. Copy the user UUID
-- 7. Run this SQL in Supabase SQL Editor:
--
--    INSERT INTO admissions_officers (id, email, prenom, nom, role, is_active)
--    VALUES (
--      'PASTE_UUID_HERE',
--      'admin@ignitoacademy.com',
--      'Admin',
--      'Test',
--      'admin',
--      TRUE
--    );
--
-- This seed migration intentionally skips admin creation to avoid foreign key errors.
-- Admin must exist in auth.users first.

DO $$
BEGIN
  RAISE NOTICE 'Admin user must be created manually in Supabase Dashboard → Authentication → Users';
  RAISE NOTICE 'Email: admin@ignitoacademy.com';
END $$;

-- ============================================================================
-- SEED DATA COMPLETE
-- ============================================================================

COMMENT ON SCHEMA public IS 'Seed data loaded for development environment';
