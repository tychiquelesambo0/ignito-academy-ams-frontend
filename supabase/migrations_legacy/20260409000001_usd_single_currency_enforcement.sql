-- =============================================
-- Ignito Academy AMS - USD Single-Currency Enforcement
-- Migration: 20260409000001_usd_single_currency_enforcement
-- Created: 2026-04-09
-- Purpose: Add payment currency fields with strict USD-only constraints
-- =============================================

-- =============================================
-- SECTION 1: ADD PAYMENT CURRENCY FIELDS
-- =============================================

-- Add payment_currency column (USD only)
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'USD';

-- Add payment_amount_paid column (29 USD only)
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS payment_amount_paid NUMERIC(10,2);

-- =============================================
-- SECTION 2: USD-ONLY CONSTRAINTS
-- =============================================

-- CRITICAL: Enforce USD single-currency
-- No CDF, no multi-currency, no exchange rates
ALTER TABLE applications
  ADD CONSTRAINT payment_currency_usd_only 
  CHECK (payment_currency = 'USD');

-- CRITICAL: Enforce 29 USD application fee
-- Payment amount must be exactly 29 USD or NULL (not yet paid)
ALTER TABLE applications
  ADD CONSTRAINT payment_amount_29_usd 
  CHECK (payment_amount_paid IS NULL OR payment_amount_paid = 29.00);

-- =============================================
-- SECTION 3: REFUND TRANSACTIONS TABLE
-- =============================================

-- Create refund_transactions table for tracking refunds
CREATE TABLE IF NOT EXISTS refund_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id VARCHAR(20) NOT NULL,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES admissions_officers(id),
  original_transaction_id VARCHAR(100) NOT NULL,
  refund_transaction_id VARCHAR(100),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  -- CRITICAL: Refunds must be in USD only
  CONSTRAINT refund_currency_usd_only CHECK (currency = 'USD'),
  
  -- Refund amount must be positive and <= 29 USD
  CONSTRAINT refund_amount_valid CHECK (amount > 0 AND amount <= 29.00),
  
  -- Status must be valid
  CONSTRAINT refund_status_valid CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Indexes for refund transactions
CREATE INDEX IF NOT EXISTS idx_refund_transactions_applicant_id 
  ON refund_transactions(applicant_id);

CREATE INDEX IF NOT EXISTS idx_refund_transactions_application_id 
  ON refund_transactions(application_id);

CREATE INDEX IF NOT EXISTS idx_refund_transactions_admin_id 
  ON refund_transactions(admin_id);

CREATE INDEX IF NOT EXISTS idx_refund_transactions_status 
  ON refund_transactions(status);

-- =============================================
-- SECTION 4: RLS POLICIES FOR REFUND_TRANSACTIONS
-- =============================================

-- Enable RLS
ALTER TABLE refund_transactions ENABLE ROW LEVEL SECURITY;

-- Applicants can read their own refund transactions
CREATE POLICY refund_transactions_select_own
  ON refund_transactions FOR SELECT
  USING (
    applicant_id IN (
      SELECT applicant_id FROM applications WHERE user_id = auth.uid()
    )
  );

-- Admissions officers can read all refund transactions
CREATE POLICY refund_transactions_select_admin
  ON refund_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- Admissions officers can insert refund transactions
CREATE POLICY refund_transactions_insert_admin
  ON refund_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- Admissions officers can update refund transactions
CREATE POLICY refund_transactions_update_admin
  ON refund_transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admissions_officers
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

-- =============================================
-- SECTION 5: UPDATE EXISTING DATA
-- =============================================

-- Set payment_currency to 'USD' for all existing applications
UPDATE applications 
SET payment_currency = 'USD' 
WHERE payment_currency IS NULL;

-- Set payment_amount_paid to 29.00 for confirmed payments
UPDATE applications 
SET payment_amount_paid = 29.00 
WHERE payment_status = 'Confirmed' AND payment_amount_paid IS NULL;

-- =============================================
-- SECTION 6: COMMENTS
-- =============================================

COMMENT ON COLUMN applications.payment_currency IS 'Payment currency - MUST be USD only (no CDF, no multi-currency)';
COMMENT ON COLUMN applications.payment_amount_paid IS 'Payment amount - MUST be 29 USD or NULL';
COMMENT ON CONSTRAINT payment_currency_usd_only ON applications IS 'CRITICAL: Enforce USD single-currency architecture';
COMMENT ON CONSTRAINT payment_amount_29_usd ON applications IS 'CRITICAL: Enforce 29 USD application fee';

COMMENT ON TABLE refund_transactions IS 'Tracks refund transactions for special cases (USD only)';
COMMENT ON CONSTRAINT refund_currency_usd_only ON refund_transactions IS 'CRITICAL: Refunds must be in USD only';

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify constraints are in place
DO $$
BEGIN
  -- Test USD-only constraint
  BEGIN
    INSERT INTO applications (
      applicant_id, user_id, intake_year, ecole_provenance, 
      option_academique, exam_status, payment_currency
    ) VALUES (
      'IGN-2026-99999', gen_random_uuid(), 2026, 'Test School',
      'Sciences', 'Diplôme obtenu', 'CDF'
    );
    RAISE EXCEPTION 'USD-only constraint failed - CDF was accepted!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✅ USD-only constraint working correctly';
  END;
  
  -- Test amount constraint
  BEGIN
    INSERT INTO applications (
      applicant_id, user_id, intake_year, ecole_provenance, 
      option_academique, exam_status, payment_amount_paid
    ) VALUES (
      'IGN-2026-99998', gen_random_uuid(), 2026, 'Test School',
      'Sciences', 'Diplôme obtenu', 50.00
    );
    RAISE EXCEPTION 'Amount constraint failed - 50 USD was accepted!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✅ 29 USD amount constraint working correctly';
  END;
END $$;

-- =============================================
-- END OF MIGRATION
-- =============================================
