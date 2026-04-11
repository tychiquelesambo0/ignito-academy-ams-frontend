-- =============================================
-- Ignito Academy AMS - Database Functions
-- Migration: 002_database_functions
-- Created: 2026-02-28
-- =============================================

-- =============================================
-- FUNCTION: generate_applicant_id()
-- Purpose: Atomically generates next Applicant_ID for given intake year
-- Returns: Applicant_ID in format IGN-[YEAR]-[SEQUENCE]
-- =============================================

CREATE OR REPLACE FUNCTION generate_applicant_id(p_intake_year INTEGER)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
AS $$
DECLARE
  v_sequence INTEGER;
  v_applicant_id VARCHAR(20);
BEGIN
  -- Lock row for update to prevent race conditions
  SELECT current_sequence INTO v_sequence
  FROM applicant_id_sequences
  WHERE intake_year = p_intake_year
  FOR UPDATE;
  
  -- If year doesn't exist, initialize it
  IF v_sequence IS NULL THEN
    INSERT INTO applicant_id_sequences (intake_year, current_sequence)
    VALUES (p_intake_year, 0)
    RETURNING current_sequence INTO v_sequence;
  END IF;
  
  -- Increment sequence
  v_sequence := v_sequence + 1;
  
  -- Update sequence counter
  UPDATE applicant_id_sequences
  SET current_sequence = v_sequence, updated_at = NOW()
  WHERE intake_year = p_intake_year;
  
  -- Format Applicant_ID: IGN-[YEAR]-[SEQUENCE]
  v_applicant_id := 'IGN-' || p_intake_year::TEXT || '-' || LPAD(v_sequence::TEXT, 5, '0');
  
  RETURN v_applicant_id;
END;
$$;

COMMENT ON FUNCTION generate_applicant_id(INTEGER) IS 'Atomically generates next Applicant_ID with row-level locking for concurrency safety';

-- =============================================
-- FUNCTION: update_application_status_with_version_check()
-- Purpose: Updates application status with optimistic locking
-- Returns: TRUE if update succeeded, FALSE if version mismatch detected
-- =============================================

CREATE OR REPLACE FUNCTION update_application_status_with_version_check(
  p_applicant_id VARCHAR(20),
  p_new_status application_status_enum,
  p_expected_version INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_version INTEGER;
  v_rows_updated INTEGER;
BEGIN
  -- Check current version
  SELECT version INTO v_current_version
  FROM applications
  WHERE applicant_id = p_applicant_id
  FOR UPDATE;
  
  -- Version mismatch (concurrent edit detected)
  IF v_current_version != p_expected_version THEN
    RETURN FALSE;
  END IF;
  
  -- Update with version increment
  UPDATE applications
  SET 
    application_status = p_new_status,
    version = version + 1,
    updated_at = NOW()
  WHERE applicant_id = p_applicant_id;
  
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  
  RETURN v_rows_updated = 1;
END;
$$;

COMMENT ON FUNCTION update_application_status_with_version_check(VARCHAR, application_status_enum, INTEGER) IS 'Updates application status with optimistic locking to prevent concurrent edit conflicts';

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Test generate_applicant_id function
DO $$
DECLARE
  v_test_id VARCHAR(20);
BEGIN
  -- Generate test ID for 2026
  v_test_id := generate_applicant_id(2026);
  
  -- Verify format
  IF v_test_id !~ '^IGN-2026-[0-9]{5}$' THEN
    RAISE EXCEPTION 'Applicant ID format validation failed: %', v_test_id;
  END IF;
  
  -- Verify it's IGN-2026-00001 (first ID)
  IF v_test_id != 'IGN-2026-00001' THEN
    RAISE EXCEPTION 'Expected IGN-2026-00001, got %', v_test_id;
  END IF;
  
  RAISE NOTICE 'generate_applicant_id() test passed: %', v_test_id;
END;
$$;
