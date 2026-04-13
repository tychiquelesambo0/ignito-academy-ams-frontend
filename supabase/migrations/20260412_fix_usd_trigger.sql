-- ============================================================================
-- Fix: Split validate_usd_only_payment() into per-table trigger functions
-- Migration: 20260412_fix_usd_trigger.sql
--
-- Root cause: the original shared function referenced NEW.currency inside an
-- IF block guarded by TG_TABLE_NAME = 'refund_transactions'.  PL/pgSQL does
-- NOT short-circuit AND conditions, so accessing NEW.currency when the trigger
-- fires on the `applications` table (which has no `currency` column) throws:
--   "record new has no field currency"
--
-- Fix: drop the shared function and replace it with two lean, table-specific
-- functions that each reference only the columns that actually exist on their
-- respective table.
-- ============================================================================

-- ── 1. Drop the broken shared trigger from both tables ───────────────────────

DROP TRIGGER IF EXISTS applications_usd_only_trigger     ON applications;
DROP TRIGGER IF EXISTS refund_transactions_usd_only_trigger ON refund_transactions;

-- ── 2. Drop the broken shared function ───────────────────────────────────────

DROP FUNCTION IF EXISTS validate_usd_only_payment();

-- ── 3. Applications-specific function ────────────────────────────────────────
-- Checks: payment_currency = 'USD' and payment_amount_paid = 29 (when set).

CREATE OR REPLACE FUNCTION validate_applications_usd_only()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_currency IS NOT NULL AND NEW.payment_currency != 'USD' THEN
    RAISE EXCEPTION
      'Devise invalide : %. Seul le USD est accepté.', NEW.payment_currency;
  END IF;

  IF NEW.payment_amount_paid IS NOT NULL AND NEW.payment_amount_paid != 29 THEN
    RAISE EXCEPTION
      'Montant invalide : $%. Les frais de dossier sont exactement 29 USD.',
      NEW.payment_amount_paid;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_applications_usd_only() IS
  'Ensures every applications row uses USD and the fee is exactly $29.';

-- ── 4. Refund-transactions-specific function ──────────────────────────────────
-- Checks: currency = 'USD'.

CREATE OR REPLACE FUNCTION validate_refund_usd_only()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.currency IS NOT NULL AND NEW.currency != 'USD' THEN
    RAISE EXCEPTION
      'Devise invalide : %. Seul le USD est accepté.', NEW.currency;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_refund_usd_only() IS
  'Ensures every refund_transactions row uses USD.';

-- ── 5. Re-attach triggers ─────────────────────────────────────────────────────

CREATE TRIGGER applications_usd_only_trigger
  BEFORE INSERT OR UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION validate_applications_usd_only();

CREATE TRIGGER refund_transactions_usd_only_trigger
  BEFORE INSERT OR UPDATE ON refund_transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_refund_usd_only();
