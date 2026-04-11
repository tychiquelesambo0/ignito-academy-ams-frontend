# Mock Payment Setup

## Overview

While waiting for Nomba API keys, the application uses a **mock payment mode** that simulates successful payments without making actual API calls.

## How It Works

### Automatic Detection

The mock payment mode is **automatically enabled** when:
- `NOMBA_API_KEY` environment variable is not set, OR
- `USE_MOCK_PAYMENT=true` environment variable is set

### Mock Payment Flow

1. **User initiates payment** by selecting a provider (M-Pesa, Orange Money, or Airtel Money)
2. **API route detects mock mode** and logs: `🔧 Using MOCK payment mode`
3. **Payment confirmed instantly**:
   - `payment_status` → `'Confirmed'`
   - `application_status` → `'Frais Réglés'`
   - `payment_confirmed_at` → Current timestamp
   - `transaction_id` → `MOCK-{timestamp}`
4. **User sees confirmation** via polling mechanism
5. **Email sent** (if email service configured)
6. **User redirected to dashboard**

### Visual Indicators

When in mock mode, users see:
```
🔧 MODE TEST: Paiement confirmé instantanément
```

Console logs show:
```
🔧 Using MOCK payment mode (Nomba API key not configured)
💰 MOCK: Simulating payment for IGN-2026-00001 via M-Pesa
✅ MOCK: Payment confirmed for IGN-2026-00001
```

## Configuration

### Current Setup (Development)

No configuration needed - mock mode is active by default when `NOMBA_API_KEY` is not set.

### Future Setup (Production)

When Nomba API keys are received:

1. Add to `.env.local`:
```bash
NOMBA_API_KEY=your_actual_nomba_api_key_here
```

2. Restart the application

3. Mock mode will automatically disable

4. Real payments will be processed through Nomba API

### Force Mock Mode (Optional)

To force mock mode even with API key set:

```bash
USE_MOCK_PAYMENT=true
```

## Testing Mock Payments

1. Complete academic history form
2. Navigate to dashboard
3. Upload required documents
4. Click "Procéder au paiement (29 USD)"
5. Select any payment provider
6. Click "Confirmer le paiement"
7. Payment confirmed instantly
8. Redirected to dashboard with "Frais Réglés" status

## Differences from Real Payment

| Feature | Mock Mode | Real Mode |
|---------|-----------|-----------|
| API Call | None | Nomba API |
| Redirect | No redirect | Redirect to payment page |
| Confirmation Time | Instant | Variable (user action) |
| Transaction ID | `MOCK-{timestamp}` | Nomba transaction ID |
| Cost | Free | 29 USD |
| Webhook | Not needed | Real webhook from Nomba |

## Code Locations

- **API Route**: `/src/app/api/payment/initiate/route.ts` (lines 77-115)
- **Payment Page**: `/src/app/apply/payment/page.tsx` (lines 64-76)
- **Mock Detection**: Checks for `NOMBA_API_KEY` environment variable

## Important Notes

⚠️ **Mock mode is for development only**
- Do not use in production
- All payments are simulated
- No actual money is processed
- Transaction IDs are fake

✅ **Safe to use for testing**
- Complete application flow works
- Email notifications work
- Status updates work
- Dashboard updates work
- Document uploads work

🔄 **Switching to Real Payments**
- Simply add `NOMBA_API_KEY` to environment
- No code changes needed
- Application automatically switches to real mode
- All existing mock transactions remain in database with `MOCK-` prefix

## Troubleshooting

**Payment not confirming?**
- Check console logs for mock mode indicator
- Ensure polling is working (check network tab)
- Wait at least 3 seconds after clicking "Confirmer le paiement"

**Want to test failed payments?**
- Mock mode only simulates successful payments
- To test failures, temporarily modify the mock code in API route

**Need to reset payment status?**
- Update database directly:
```sql
UPDATE applications 
SET payment_status = 'Pending', 
    application_status = 'Dossier Créé',
    payment_confirmed_at = NULL,
    transaction_id = NULL
WHERE applicant_id = 'IGN-2026-00001';
```
