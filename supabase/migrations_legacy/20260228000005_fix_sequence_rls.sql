-- =============================================
-- Fix RLS Policies for applicant_id_sequences
-- Migration: 005_fix_sequence_rls
-- Created: 2026-02-28
-- =============================================

-- The generate_applicant_id() function needs to insert/update sequences
-- Allow authenticated users to insert new sequences for their intake year
CREATE POLICY applicant_id_sequences_insert_authenticated
  ON applicant_id_sequences FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update sequences (for atomic increment)
CREATE POLICY applicant_id_sequences_update_authenticated
  ON applicant_id_sequences FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to select sequences (needed for the function)
CREATE POLICY applicant_id_sequences_select_authenticated
  ON applicant_id_sequences FOR SELECT
  TO authenticated
  USING (true);
