-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Scholarship engine + waived payment status
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add 'waived' to the payment_status enum
--    (existing 'paid' / 'Pending' / 'Confirmed' / 'Failed' values untouched)
ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'waived';

-- 2. Add scholarship columns to applications table
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS grade_10_average       NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS grade_11_average       NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS grade_12_average       NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS exetat_percentage      NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS graduation_year        SMALLINT,
  ADD COLUMN IF NOT EXISTS is_scholarship_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS scholarship_status     TEXT    NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS scholarship_video_url  TEXT;

-- 3. Add a check constraint to keep grades in 0-100 range
ALTER TABLE applications
  ADD CONSTRAINT chk_grade_10 CHECK (grade_10_average IS NULL OR (grade_10_average >= 0 AND grade_10_average <= 100)),
  ADD CONSTRAINT chk_grade_11 CHECK (grade_11_average IS NULL OR (grade_11_average >= 0 AND grade_11_average <= 100)),
  ADD CONSTRAINT chk_grade_12 CHECK (grade_12_average IS NULL OR (grade_12_average >= 0 AND grade_12_average <= 100)),
  ADD CONSTRAINT chk_exetat   CHECK (exetat_percentage IS NULL OR (exetat_percentage >= 0 AND exetat_percentage <= 100));

-- 4. Index for scholarship eligibility filter (admin queries)
CREATE INDEX IF NOT EXISTS idx_applications_scholarship
  ON applications (is_scholarship_eligible)
  WHERE is_scholarship_eligible = TRUE;
