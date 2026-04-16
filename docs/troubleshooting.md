# Troubleshooting Guide — Admitta AMS

---

## Local Development

### "Module not found" or import errors

```bash
# Delete node_modules and reinstall
rm -rf node_modules .next
npm ci
```

### Environment variables not picked up

- Restart the dev server after editing `.env.local`
- Verify variable names match exactly (case-sensitive, including `NEXT_PUBLIC_` prefix)
- `NEXT_PUBLIC_*` variables are inlined at build time — changes require a full rebuild

```bash
npm run dev   # restart
```

### TypeScript errors in editor but not in terminal

- Reload your editor's TypeScript server
- In VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"

---

## Authentication

### Admin redirected back to `/admin/login`

**Cause:** The admin user exists in `auth.users` but not in `admissions_officers`.

**Fix:**
```sql
-- In Supabase SQL Editor
SELECT id FROM auth.users WHERE email = 'admin@ignitoacademy.com';

INSERT INTO admissions_officers (id, email, role)
VALUES ('<uuid-from-above>', 'admin@ignitoacademy.com', 'admin')
ON CONFLICT (id) DO NOTHING;
```

### Applicant stuck on "confirm your email" after registration

**Cause:** Email confirmation link expired (default: 24 hours).

**Fix:** In Supabase Dashboard → Authentication → Users, find the user and manually confirm their email, or resend the confirmation email.

### Auth callback returns 400 "invalid code"

**Cause:** The auth callback URL is not configured in Supabase.

**Fix:** In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://admissions.ignitoacademy.com`
- Redirect URLs: Add `https://admissions.ignitoacademy.com/auth/callback`

---

## Payments

### Payment initiation returns 500

1. Check `PAYMENT_PROVIDER` is set (`mock` or `pawapay`)
2. If `pawapay`, verify `PAWAPAY_API_KEY` and `PAWAPAY_BASE_URL` are set
3. Check Vercel function logs for the exact error

### PawaPay webhook not received

1. Verify the webhook URL is registered in PawaPay dashboard:
   `https://admissions.ignitoacademy.com/api/webhooks/pawapay`
2. Verify `PAWAPAY_WEBHOOK_SECRET` matches the secret in PawaPay dashboard
3. Check Vercel logs for HMAC signature errors

### Payment shows "COMPLETED" but applicant status is still "Dossier créé"

**Cause:** Webhook was received but the DB update failed.

**Fix:**
```sql
-- Check webhook_logs for the transaction
SELECT * FROM webhook_logs
WHERE payload->>'depositId' = '<transaction-id>'
ORDER BY processed_at DESC;

-- Manually update if needed
UPDATE applications
SET payment_status = 'paid',
    payment_reference = '<transaction-id>',
    status = 'Paiement effectué'
WHERE applicant_id = (SELECT id FROM applicants WHERE email = '<applicant-email>');
```

### Rate limit 429 on payment initiation

The limit is 5 payment attempts per IP per 15 minutes. This resets automatically. No action needed unless a legitimate user is blocked — in that case, identify the IP and consider adjusting `PAYMENT_RATE_LIMIT` in `src/lib/security/rate-limit.ts`.

---

## Email

### Emails not sending (local dev)

- Set `RESEND_API_KEY` in `.env.local`
- Check Resend dashboard for delivery logs
- In dev, emails may go to Resend's test mode (check dev/test key vs production key)

### Emails not sending (production)

1. Verify domain is verified in Resend: resend.com → Domains
2. Verify `FROM_EMAIL` matches a verified Resend domain
3. Check Edge Function logs: `supabase functions logs admin-decision`
4. Check Supabase secrets: `supabase secrets list`

### Decision email sent but PDF not attached

**Cause:** Edge Function could not fetch `PDF_LOGO_URL` or `PDF_SIGNATURE_URL`.

**Fix:**
- Ensure both URLs are publicly accessible (no auth required)
- Test with `curl <PDF_LOGO_URL>` — should return a 200 with image data
- Update Supabase secret: `supabase secrets set PDF_LOGO_URL=<new-url>`

---

## Database

### RLS blocking applicant from seeing their data

**Cause:** The applicant's `auth.uid()` does not match `applicants.id`.

**Fix:** Verify the applicant was created correctly via the signup flow (the `complete-signup` API route should insert with `id = auth.uid()`).

### "duplicate key value violates unique constraint"

- For `applicants`: the user already has an application — do not create a second one
- For `intake_sequences`: the sequence is already seeded for this year — no action needed

### Migration fails with "relation already exists"

The database may have been partially migrated. Run:
```bash
supabase db diff   # see what's pending
supabase db push   # push remaining migrations
```

---

## Supabase Edge Functions

### Function returns 500 "internal server error"

```bash
# View real-time logs
supabase functions logs admin-decision --tail
supabase functions logs scholarship-eligibility --tail
```

### Function deployed but changes not reflected

```bash
# Redeploy
supabase functions deploy admin-decision --no-verify-jwt
supabase functions deploy scholarship-eligibility --no-verify-jwt
```

### "Missing environment variable" in Edge Function

```bash
# List current secrets
supabase secrets list

# Set missing secret
supabase secrets set RESEND_API_KEY=re_...
```

---

## CI/CD (GitHub Actions)

### "OTHM keyword detected" CI failure

A file in the commit contains the prohibited word. Search for it:

```bash
grep -rn --include="*.ts" --include="*.tsx" "OTHM" src/ supabase/
```

Replace with "UK Level 3 Foundation Diploma" and push again.

### Build fails with "missing environment variable"

The `build` job requires real Supabase secrets in GitHub Secrets. Add them in:
GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret

Required secrets:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`

### E2E tests not running in CI

Set the repository variable `E2E_ENABLED` to `true` in:
GitHub → Repository → Settings → Variables → Actions

Also add the E2E credential secrets (`E2E_ADMIN_EMAIL`, etc.).

---

## Production (Vercel)

### Deployment fails with "build error"

1. Check Vercel build logs
2. Confirm all required environment variables are set in Vercel Dashboard
3. Try building locally first: `npm run build`

### 500 errors in production but not locally

- Check Vercel function logs (Vercel Dashboard → Project → Functions)
- Add temporary `console.log` statements and redeploy to diagnose
- Verify all server-side env vars are set (without `NEXT_PUBLIC_` prefix)

### Custom domain not working

- Verify DNS records in your domain registrar point to Vercel
- Check Vercel Dashboard → Project → Domains for SSL certificate status
- SSL provisioning can take up to 24 hours for new domains

---

## Health Check

A public health check endpoint is available at:

```
GET https://admissions.ignitoacademy.com/api/health
```

It returns:
- `200 OK` with `{ "status": "ok" }` when the database is reachable
- `503 Service Unavailable` with `{ "status": "degraded" }` when the database is unreachable

Use this endpoint with UptimeRobot, Better Uptime, or any monitoring service.

---

*Last Updated: April 2026*
