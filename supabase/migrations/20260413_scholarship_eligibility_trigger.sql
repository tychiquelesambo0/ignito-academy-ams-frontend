-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: auto-compute is_scholarship_eligible via DB trigger
--
-- Problem: the field defaulted to FALSE and was only updated by the academic-
-- history form. Once a dossier is locked (payment confirmed) applicants could
-- no longer re-save that form, so the flag stayed FALSE even for qualifying
-- students.
--
-- Solution (two layers):
--   1. A BEFORE INSERT OR UPDATE trigger recomputes the flag atomically
--      whenever grade_10_average, grade_11_average, grade_12_average,
--      exetat_percentage, or graduation_year are touched.
--   2. A one-time backfill corrects all existing rows.
--
-- Eligibility criteria (ALL must be true):
--   • grade_10_average  ≥ 70 %
--   • grade_11_average  ≥ 70 %
--   • grade_12_average  ≥ 70 %
--   • exetat_percentage ≥ 70 %
--   • graduation_year   ≥ 2024
--   • applicant age     < 20 years  (derived from applicants.date_naissance)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Trigger function ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION compute_scholarship_eligibility()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_date_naissance DATE;
  v_age            INT;
BEGIN
  -- Fetch the applicant's date of birth from the linked profile row
  SELECT date_naissance
    INTO v_date_naissance
    FROM applicants
   WHERE id = NEW.user_id;

  -- Age in full completed years; NULL DOB → 99 (ineligible)
  IF v_date_naissance IS NOT NULL THEN
    v_age := DATE_PART('year', AGE(CURRENT_DATE, v_date_naissance))::INT;
  ELSE
    v_age := 99;
  END IF;

  -- Evaluate all five criteria atomically
  NEW.is_scholarship_eligible := (
    COALESCE(NEW.grade_10_average,  0) >= 70 AND
    COALESCE(NEW.grade_11_average,  0) >= 70 AND
    COALESCE(NEW.grade_12_average,  0) >= 70 AND
    COALESCE(NEW.exetat_percentage, 0) >= 70 AND
    COALESCE(NEW.graduation_year,   0) >= 2024 AND
    v_age < 20
  );

  RETURN NEW;
END;
$$;

-- ── 2. Attach trigger to applications table ────────────────────────────────────

DROP TRIGGER IF EXISTS trg_compute_scholarship_eligibility ON applications;

CREATE TRIGGER trg_compute_scholarship_eligibility
BEFORE INSERT OR UPDATE OF
  grade_10_average,
  grade_11_average,
  grade_12_average,
  exetat_percentage,
  graduation_year
ON applications
FOR EACH ROW
EXECUTE FUNCTION compute_scholarship_eligibility();

-- ── 3. Backfill ALL existing rows ─────────────────────────────────────────────
-- Forces a no-op UPDATE on every application row that has at least one grade
-- recorded, which fires the trigger and recomputes is_scholarship_eligible.

UPDATE applications a
SET    grade_10_average = a.grade_10_average   -- trigger fires on this column change
WHERE  a.grade_10_average IS NOT NULL
    OR a.grade_11_average IS NOT NULL
    OR a.grade_12_average IS NOT NULL
    OR a.exetat_percentage IS NOT NULL;
