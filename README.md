# Admitta — Ignito Academy Admission Management System

> Portail officiel de gestion des candidatures pour **Ignito Academy**
> UK Level 3 Foundation Diploma | Cohorte 2026

**Live:** [https://admissions.ignitoacademy.com](https://admissions.ignitoacademy.com)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Four Architectural Pillars](#4-four-architectural-pillars)
5. [Prerequisites](#5-prerequisites)
6. [Local Development Setup](#6-local-development-setup)
7. [Environment Variables](#7-environment-variables)
8. [Database Setup](#8-database-setup)
9. [Supabase Edge Functions](#9-supabase-edge-functions)
10. [Testing](#10-testing)
11. [Deployment](#11-deployment)
12. [API Endpoints](#12-api-endpoints)
13. [Security](#13-security)
14. [OTHM Keyword Prohibition](#14-othm-keyword-prohibition)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Overview

Admitta is the production-grade Admission Management System for Ignito Academy. It handles the complete applicant lifecycle:

1. **Application creation** — applicant creates an account and a dossier
2. **Payment** — USD mobile money payment via PawaPay (M-Pesa, Orange Money, Airtel Money)
3. **Document upload** — diplomas, transcripts, ID, photo
4. **Scholarship assessment** — optional; auto-evaluated by a Supabase Edge Function
5. **Admin review** — admission officers review and issue a decision
6. **PDF letter generation** — automated acceptance/rejection letter sent by email

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                        │
│              (CDN, HTTPS, Security Headers)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│               Next.js 14 App Router (src/app)                 │
│                                                               │
│  Public Routes           │  Protected Routes                  │
│  /apply                  │  /dashboard  (Supabase Auth)       │
│  /apply/confirm-email    │  /admin      (Supabase Auth)       │
│  /auth/callback          │                                    │
│                          │                                    │
│  API Routes (src/app/api)                                     │
│  /api/payment/initiate   │  /api/documents/upload             │
│  /api/webhooks/pawapay   │  /api/admin/decision               │
│  /api/applications/*     │  /api/health                       │
└──────────┬───────────────┴───────────────┬──────────────────┘
           │                               │
┌──────────▼────────────┐    ┌─────────────▼──────────────────┐
│  Supabase (PostgreSQL) │    │  Supabase Edge Functions (Deno) │
│  - RLS on all tables  │    │  - admin-decision               │
│  - Auth               │    │  - scholarship-eligibility      │
│  - Storage Buckets    │    │  - send-decision-email          │
└───────────────────────┘    └────────────────────────────────┘
           │
┌──────────▼───────────────────────────────────────────────────┐
│  External Services                                             │
│  PawaPay (mobile money)  │  Resend (transactional email)     │
└───────────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL 15) |
| Auth | Supabase Auth (magic link + email/password) |
| Storage | Supabase Storage (documents + PDFs buckets) |
| Edge Functions | Deno (Supabase Edge Runtime) |
| Payment | PawaPay (USD mobile money — DRC) |
| Email | Resend |
| PDF Generation | Supabase Edge Function (jsPDF) |
| Validation | Zod |
| Testing | Vitest (unit/property) + Playwright (E2E) |
| Hosting | Vercel (cdg1 — Paris region) |
| CI/CD | GitHub Actions |

---

## 4. Four Architectural Pillars

These constraints are **non-negotiable** and enforced at every level:

### Pillar 1 — USD Single-Currency

All payments are in **USD only**. No CDF, no exchange rates, no multi-currency logic.
- Database `CHECK` constraint: `payment_currency = 'USD'`
- Webhook rejects any non-USD callback silently (returns 200, no DB update)
- `APPLICATION_FEE_USD = 29` is the single source of truth

### Pillar 2 — OTHM Keyword Ban

The word "OTHM" is **strictly prohibited** throughout the entire codebase for IP protection.
Use **"UK Level 3 Foundation Diploma"** instead. The CI pipeline enforces this automatically.

### Pillar 3 — Supabase Auth Only

All authentication and session management is handled **exclusively by Supabase Auth**.
No `bcrypt`, `argon2`, or manual password hashing. Route protection via `supabase.auth.getUser()`.

### Pillar 4 — Video URLs Only

Scholarship pitches are submitted as **YouTube/Vimeo URLs only**.
No `<input type="file" accept="video/*">`, no video storage bucket.
Database validates: `scholarship_video_url ~* '^https?://(www\.)?(youtube\.com|vimeo\.com)'`

---

## 5. Prerequisites

- **Node.js** ≥ 22 (`node --version`)
- **npm** ≥ 10 (`npm --version`)
- **Supabase CLI** ≥ 2 (`supabase --version`) — for Edge Functions
- A **Supabase** project (free tier works for development)
- A **Resend** account with a verified domain
- A **PawaPay** sandbox account (for payment testing)
- A **Vercel** account (for deployment)

---

## 6. Local Development Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd ignito-academy-ams-frontend-main

# 2. Install dependencies
npm ci

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your credentials (see Section 7)

# 4. Start the development server
npm run dev
# App runs at http://localhost:3000
# /apply is the public portal entry point
```

---

## 7. Environment Variables

Copy `.env.example` to `.env.local`. All variables are documented inline in `.env.example`.

**Quick reference:**

| Variable | Required | Where to Get It |
|----------|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Dashboard → Project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase Dashboard → Project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server only) | Supabase Dashboard → Project → Settings → API |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` (dev) / `https://admissions.ignitoacademy.com` (prod) |
| `PAYMENT_PROVIDER` | Yes | `mock` (dev) or `pawapay` (prod) |
| `APPLICATION_FEE_USD` | Yes | `29` (hardcoded) |
| `PAWAPAY_API_KEY` | Prod | PawaPay Developer Portal |
| `PAWAPAY_API_SECRET` | Prod | PawaPay Developer Portal |
| `PAWAPAY_BASE_URL` | Prod | `https://api.sandbox.pawapay.io` or `https://api.pawapay.io` |
| `PAWAPAY_WEBHOOK_SECRET` | Prod | PawaPay Developer Portal |
| `RESEND_API_KEY` | Yes | resend.com → API Keys |
| `FROM_EMAIL` | Yes | Verified Resend domain address |
| `PDF_LOGO_URL` | Prod | Supabase Storage public URL |
| `PDF_SIGNATURE_URL` | Prod | Supabase Storage public URL |
| `PDF_FOOTER_TEXT` | Yes | Custom footer for PDF letters |
| `INTAKE_YEAR` | Yes | `2026` |

**Supabase Edge Functions Secrets** (set via `supabase secrets set`):

```bash
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set FROM_EMAIL=admissions@ignitoacademy.com
supabase secrets set PDF_LOGO_URL=https://...
supabase secrets set PDF_SIGNATURE_URL=https://...
supabase secrets set PDF_FOOTER_TEXT="Ignito Academy | ..."
```

**Vercel Environment Variables:**
Set all non-`NEXT_PUBLIC_*` variables as encrypted in Vercel Dashboard → Project → Settings → Environment Variables.

---

## 8. Database Setup

### Migrations

All migrations are in `supabase/migrations/`. They must be run in order:

```bash
# Link to your Supabase project
supabase link --project-ref <your-project-ref>

# Push all migrations
supabase db push

# Verify
supabase db diff
```

### Schema Overview

| Table | Purpose |
|-------|---------|
| `applicants` | Core applicant profile (linked to `auth.users`) |
| `applications` | Application dossier (status machine, payment status) |
| `uploaded_documents` | Document metadata (7 accepted types) |
| `scholarship_applications` | Scholarship eligibility results |
| `webhook_logs` | PawaPay webhook audit trail |
| `admissions_officers` | Admin accounts (linked to `auth.users`) |
| `intake_sequences` | ID generation sequences (IGN-YYYY-NNNNN) |

Row Level Security (RLS) is enabled on all tables. Applicants can only access their own data.

### Creating the Admin User

1. Go to Supabase Dashboard → Authentication → Users → Invite User
2. Enter `admin@ignitoacademy.com`
3. After the user accepts, get their UUID from the `auth.users` table
4. Insert into `admissions_officers`:
   ```sql
   INSERT INTO admissions_officers (id, email, role)
   VALUES ('<uuid-from-auth.users>', 'admin@ignitoacademy.com', 'admin');
   ```

---

## 9. Supabase Edge Functions

Two Edge Functions handle server-side logic:

### `admin-decision`

Triggered when an admin sets a decision (accept/reject). Generates the PDF letter and sends the decision email via Resend.

```bash
# Deploy
supabase functions deploy admin-decision --no-verify-jwt

# Logs
supabase functions logs admin-decision
```

### `scholarship-eligibility`

Evaluates scholarship eligibility based on academic history (GPA, age, financial need). Returns the scholarship percentage and justification.

```bash
supabase functions deploy scholarship-eligibility --no-verify-jwt
```

---

## 10. Testing

### Unit & Property Tests (Vitest)

```bash
npm run test              # All unit + property tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
npm run test:unit         # Unit tests only
npm run test:property     # Property-based tests only (fast-check)
```

**Current status:** 960/960 tests passing.

Properties tested (P01–P65):
- Payment amount invariance (USD only, $29.00 exactly)
- Scholarship eligibility boundary conditions
- Video URL validation (YouTube/Vimeo only)
- Four architectural pillars enforcement
- Status machine transitions
- Email template correctness

### E2E Tests (Playwright)

```bash
npm run test:e2e          # All E2E tests (headless)
npm run test:e2e:ui       # With Playwright UI
```

E2E tests require a running dev server (`npm run dev` in another terminal) and optional credentials:

```bash
# .env.test.local (never commit)
E2E_ADMIN_EMAIL=admin@ignitoacademy.com
E2E_ADMIN_PASSWORD=...
E2E_TEST_EMAIL=...
E2E_TEST_PASSWORD=...
```

Tests that require credentials are automatically skipped if these variables are not set.

### CI/CD

GitHub Actions runs on every push/PR:
- Unit & property tests
- ESLint
- TypeScript type-check
- OTHM keyword guard
- Build verification
- E2E tests (main branch only, when `E2E_ENABLED=true` repo variable is set)

---

## 11. Deployment

### Production: Vercel

The application is deployed to Vercel automatically on push to `main`.

**Manual deployment:**
```bash
npx vercel --prod
```

**Required GitHub Secrets** (set in repo → Settings → Secrets and variables → Actions):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
E2E_ADMIN_EMAIL      (optional, for E2E)
E2E_ADMIN_PASSWORD   (optional, for E2E)
E2E_TEST_EMAIL       (optional, for E2E)
E2E_TEST_PASSWORD    (optional, for E2E)
```

### PawaPay Production Credentials (Manual Step)

When switching from sandbox to production:

1. Log in to [PawaPay Merchant Portal](https://dashboard.pawapay.io)
2. Generate a production API key and webhook secret
3. Update Vercel environment variables:
   - `PAWAPAY_API_KEY` → production key
   - `PAWAPAY_BASE_URL` → `https://api.pawapay.io`
   - `PAWAPAY_WEBHOOK_SECRET` → production webhook secret
   - `PAYMENT_PROVIDER` → `pawapay`
4. Register the webhook URL in PawaPay:
   `https://admissions.ignitoacademy.com/api/webhooks/pawapay`
5. Redeploy the application

### Database Backups (Manual Step)

Supabase provides automatic daily backups on the **Pro plan**:

1. Upgrade Supabase project to Pro (supabase.com → Billing)
2. Backups appear in Dashboard → Project → Database → Backups
3. Point-in-time recovery is available (Pro+)

For additional protection, schedule a weekly export:
```bash
supabase db dump -f backup-$(date +%Y-%m-%d).sql
```

---

## 12. API Endpoints

All endpoints require authentication unless noted.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | None | System health check |
| `POST` | `/api/payment/initiate` | Applicant | Initiate mobile money payment |
| `POST` | `/api/webhooks/pawapay` | HMAC sig | PawaPay payment callback |
| `POST` | `/api/documents/upload` | Applicant | Upload application document |
| `POST` | `/api/documents/notify-submitted` | Applicant | Notify admin of document submission |
| `POST` | `/api/applications/resubmit` | Applicant | Request document resubmission |
| `POST` | `/api/admin/decision` | Admin | Set admission decision |
| `GET` | `/api/pawapay-correspondents` | Applicant | List available mobile operators |
| `POST` | `/api/auth/complete-signup` | None | Complete email-verified signup |

### Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/payment/initiate` | 5 requests | 15 minutes per IP |
| `/api/documents/upload` | 30 requests | 10 minutes per IP |

---

## 13. Security

### Headers

All responses include:

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | Strict CSP (see `next.config.js`) |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

### Webhook Security

PawaPay webhooks are verified via HMAC-SHA256 signature on every callback.
Non-USD payments are silently rejected (returns 200 to prevent PawaPay retries).

### Row Level Security

All Supabase tables have RLS enabled. Applicants can only read/write their own rows.
Admins use a service-role client for privileged operations.

---

## 14. OTHM Keyword Prohibition

The word **"OTHM"** is strictly banned from this codebase for IP protection.

**Use instead:** "UK Level 3 Foundation Diploma"

**Enforcement:**
- CI pipeline (`ci.yml`) scans every push and fails the build if "OTHM" is detected in any `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, or `.sql` file.
- All 65 property-based tests include a pillar-compliance check.
- Code review checklist includes this item.

---

## 15. Troubleshooting

### "Supabase client not configured" on startup

- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in `.env.local`
- Restart the dev server after editing `.env.local`

### Payment initiation fails (mock mode)

- Confirm `PAYMENT_PROVIDER=mock` in `.env.local`
- Mock provider returns success immediately — no real money is moved

### Payment initiation fails (PawaPay)

- Check `PAWAPAY_API_KEY` is set and correct
- Confirm `PAWAPAY_BASE_URL` matches the environment (sandbox vs production)
- Check PawaPay API status at status.pawapay.io

### Emails not sending

- Verify `RESEND_API_KEY` starts with `re_`
- Verify `FROM_EMAIL` domain is verified in Resend dashboard
- Check Resend logs at resend.com/emails

### Edge Functions returning 500

- Run `supabase functions logs <function-name>` to see errors
- Verify Supabase secrets are set: `supabase secrets list`

### Admin login redirects back to login page

- Confirm the admin user exists in both `auth.users` AND `admissions_officers`
- Check that the UUIDs match

### E2E tests skipped (no credentials)

- Create `.env.test.local` (see Section 10)
- The file is parsed automatically by `playwright.config.ts`

---

## Contributing

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Write tests alongside your implementation
3. Run `npm run test` and ensure all 960 tests pass
4. Run `npm run lint` — zero warnings
5. Check that "OTHM" does not appear anywhere: `grep -r "OTHM" src/ supabase/`
6. Submit a PR against `main`

**Code review checklist:**
- [ ] No "OTHM" keyword present
- [ ] All tests passing
- [ ] Error messages in formal French
- [ ] Security considerations addressed
- [ ] No `bcrypt` / `argon2` / manual password hashing
- [ ] No video file upload inputs
- [ ] USD only (no CDF, no multi-currency)

---

*Document Status: Production-Ready | Last Updated: April 2026*
