-- Migration: USD Single-Currency Enforcement
-- Date: 2026-04-11
-- Description: Add database constraints to enforce USD-only payments
-- 
-- CRITICAL: This enforces Architectural Pillar #1 - USD Single-Currency ONLY
-- No CDF or other currencies are allowed in this system

-- ============================================================================
-- 1. Add CHECK constraint to applications table
-- ============================================================================

-- Ensure payment_amount is exactly 29 USD (application fee)
ALTER TABLE applications
ADD CONSTRAINT applications_payment_amount_check 
CHECK (payment_amount = 29);

-- Ensure currency is always USD
ALTER TABLE applications
ADD CONSTRAINT applications_currency_check 
CHECK (currency = 'USD');

-- ============================================================================
-- 2. Add CHECK constraint to webhook_logs table
-- ============================================================================

-- Ensure all webhook amounts are in USD
ALTER TABLE webhook_logs
ADD CONSTRAINT webhook_logs_currency_check 
CHECK (
  payload->>'currency' = 'USD' OR 
  payload->>'currency' IS NULL
);

-- ============================================================================
-- 3. Add CHECK constraint to refund_transactions table
-- ============================================================================

-- Ensure all refunds are in USD
ALTER TABLE refund_transactions
ADD CONSTRAINT refund_transactions_currency_check 
CHECK (currency = 'USD');

-- Ensure refund amount is positive and reasonable
ALTER TABLE refund_transactions
ADD CONSTRAINT refund_transactions_amount_check 
CHECK (amount_usd > 0 AND amount_usd <= 10000);

-- ============================================================================
-- 4. Create function to validate USD-only payments
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_usd_only_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Check currency is USD
  IF NEW.currency != 'USD' THEN
    RAISE EXCEPTION 'Invalid currency: %. Only USD is supported.', NEW.currency;
  END IF;
  
  -- Check amount is exactly 29 USD for applications
  IF TG_TABLE_NAME = 'applications' AND NEW.payment_amount != 29 THEN
    RAISE EXCEPTION 'Invalid payment amount: $%. Application fee must be exactly $29 USD.', NEW.payment_amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Create trigger for applications table
-- ============================================================================

DROP TRIGGER IF EXISTS applications_usd_only_trigger ON applications;

CREATE TRIGGER applications_usd_only_trigger
  BEFORE INSERT OR UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION validate_usd_only_payment();

-- ============================================================================
-- 6. Create trigger for refund_transactions table
-- ============================================================================

DROP TRIGGER IF EXISTS refund_transactions_usd_only_trigger ON refund_transactions;

CREATE TRIGGER refund_transactions_usd_only_trigger
  BEFORE INSERT OR UPDATE ON refund_transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_usd_only_payment();

-- ============================================================================
-- 7. Add comments for documentation
-- ============================================================================

COMMENT ON CONSTRAINT applications_payment_amount_check ON applications IS 
'Enforces application fee of exactly $29 USD';

COMMENT ON CONSTRAINT applications_currency_check ON applications IS 
'Enforces USD-only currency. No CDF or other currencies allowed.';

COMMENT ON CONSTRAINT webhook_logs_currency_check ON webhook_logs IS 
'Enforces USD-only currency in webhook payloads';

COMMENT ON CONSTRAINT refund_transactions_currency_check ON refund_transactions IS 
'Enforces USD-only currency for refunds';

COMMENT ON FUNCTION validate_usd_only_payment() IS 
'Validates that all payments are in USD and amounts are correct';
