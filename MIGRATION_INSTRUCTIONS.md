# Database Migration Instructions

## Task 7: USD Single-Currency Enforcement

### Migration File
`supabase/migrations/20260411_usd_only_constraints.sql`

### How to Apply

#### Option 1: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: ignito-academy-ams
3. **Click "SQL Editor"** in the left sidebar
4. **Click "New Query"**
5. **Copy the entire contents** of `supabase/migrations/20260411_usd_only_constraints.sql`
6. **Paste into the SQL editor**
7. **Click "Run"** (or press Cmd+Enter)
8. **Verify success**: You should see "Success. No rows returned"

#### Option 2: Supabase CLI (Alternative)

```bash
# Make sure you're in the project directory
cd /Users/cash/Admitta\ AMS/ignito-academy-ams-frontend-main

# Link to your Supabase project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
npx supabase db push
```

### What This Migration Does

1. **Adds CHECK constraints** to ensure:
   - `applications.payment_amount` is exactly 29 USD
   - `applications.currency` is always 'USD'
   - `webhook_logs` only contain USD currency
   - `refund_transactions.currency` is always 'USD'
   - `refund_transactions.amount_usd` is positive and ≤ $10,000

2. **Creates validation function** `validate_usd_only_payment()`:
   - Rejects non-USD currencies
   - Rejects payment amounts other than $29 USD

3. **Creates triggers** on:
   - `applications` table (before INSERT/UPDATE)
   - `refund_transactions` table (before INSERT/UPDATE)

### Verification

After applying the migration, test it:

```sql
-- This should SUCCEED (29 USD)
INSERT INTO applications (
  applicant_id, payment_amount, currency, payment_status
) VALUES (
  'test-id', 29, 'USD', 'Pending'
);

-- This should FAIL (wrong amount)
INSERT INTO applications (
  applicant_id, payment_amount, currency, payment_status
) VALUES (
  'test-id', 30, 'USD', 'Pending'
);
-- Error: Invalid payment amount: $30. Application fee must be exactly $29 USD.

-- This should FAIL (wrong currency)
INSERT INTO applications (
  applicant_id, payment_amount, currency, payment_status
) VALUES (
  'test-id', 29, 'CDF', 'Pending'
);
-- Error: Invalid currency: CDF. Only USD is supported.
```

### Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Remove triggers
DROP TRIGGER IF EXISTS applications_usd_only_trigger ON applications;
DROP TRIGGER IF EXISTS refund_transactions_usd_only_trigger ON refund_transactions;

-- Remove function
DROP FUNCTION IF EXISTS validate_usd_only_payment();

-- Remove constraints
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_payment_amount_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_currency_check;
ALTER TABLE webhook_logs DROP CONSTRAINT IF EXISTS webhook_logs_currency_check;
ALTER TABLE refund_transactions DROP CONSTRAINT IF EXISTS refund_transactions_currency_check;
ALTER TABLE refund_transactions DROP CONSTRAINT IF EXISTS refund_transactions_amount_check;
```

### Notes

- ⚠️ **This migration is CRITICAL** - it enforces Architectural Pillar #1
- ✅ **Safe to apply** - it only adds constraints, doesn't modify data
- ✅ **Idempotent** - safe to run multiple times (uses IF EXISTS checks)
- 🔒 **Production-ready** - includes proper error messages and documentation
