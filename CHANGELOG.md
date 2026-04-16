# Changelog — Admitta AMS

All notable changes to this project are documented here.

---

## [0.8.0] — April 2026 (Phase 8: Deployment & Documentation)

### Added
- GitHub Actions CI/CD pipeline (`.github/workflows/ci.yml`)
  - Unit & property tests on every push/PR
  - ESLint + TypeScript type-check
  - OTHM keyword guard (auto-fails build if prohibited keyword detected)
  - Build verification (requires real Supabase secrets in GitHub Secrets)
  - E2E tests on `main` branch (when `E2E_ENABLED=true` repo variable is set)
- Comprehensive `README.md` with architecture, setup, API reference, security, and OTHM policy
- `CHANGELOG.md` (this file)
- `docs/admin-guide.md` — Admin portal user guide (French)
- `docs/applicant-guide.md` — Applicant portal user guide (French)
- `docs/troubleshooting.md` — Extended troubleshooting reference

---

## [0.7.0] — April 2026 (Phase 7: Security, Performance & Observability)

### Added
- Content Security Policy (CSP) in `next.config.js` — strict directives for scripts, styles, frames, connect sources
- HTTP security headers: HSTS (2 years, preload), X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- In-memory sliding-window rate limiter (`src/lib/security/rate-limit.ts`)
  - Payment initiation: 5 req / 15 min per IP
  - Document upload: 30 req / 10 min per IP
- Structured JSON logger (`src/lib/logger.ts`) — compatible with Vercel log drains
- Health check endpoint (`GET /api/health`) — database probe, uptime, version
- Admin dashboard client-side pagination (25 rows per page) with prev/next controls and page pills

### Changed
- `vercel.json` already had security headers; `next.config.js` now also enforces them server-side for all dynamic routes

---

## [0.6.0] — April 2026 (Phase 6: Test Suite)

### Added
- Property-based tests P46–P65 (`src/__tests__/property-p46-p65-four-pillars.test.ts`)
  - 77 new tests using fast-check
  - Four Architectural Pillars enforced via property tests
  - Payment abstraction, scholarship eligibility, video URL validation
- Full E2E test suite (Playwright) covering applicant flow, admin flow, landing page
- `.env.test.local` support — Playwright loads E2E credentials without `dotenv`

### Fixed
- Stale test expectations in `lib-auth-validation.test.ts` (phone number format)
- Stale test expectations in `lib-email-templates.test.ts` (branding, institutional signature)
- E2E selector mismatches (tab buttons, email input strict mode, dashboard assertions)

---

## [0.5.0] — April 2026 (Phase 5: Integrations)

### Added
- PawaPay webhook handler (`/api/webhooks/pawapay`) — HMAC-SHA256 verification, idempotency, USD/amount validation
- Supabase Edge Function: `scholarship-eligibility` — GPA + age + financial need evaluation
- Supabase Edge Function: `admin-decision` — PDF generation + decision email via Resend
- Payment initiation endpoint (`/api/payment/initiate`) with mock and PawaPay providers
- Payment abstraction layer (`src/lib/payment/`) — `PaymentProvider` interface, factory, mock
- Email with retry (`src/lib/email/send-with-retry.ts`) — exponential backoff, 3 attempts
- Document request notification email (`/api/documents/notify-submitted`)

### Fixed
- Deployed Edge Functions to Supabase (were not previously deployed)
- Set Supabase secrets for `RESEND_API_KEY` and `FROM_EMAIL`

---

## [0.4.0] — April 2026 (Phase 4: Frontend Completion)

### Added
- Applicant dashboard with status machine visualization (7 steps)
- Document upload UI with drag-and-drop and per-type tracking
- Scholarship application form (GPA, financial need, video URL)
- Admin portal: application list, detail view, decision form, document review
- PDF letter download for admitted applicants

### Changed
- Application status machine finalized: `Dossier créé` → `Paiement effectué` → `Documents soumis` → `En cours d'examen` → `Admission sous réserve` / `Admission définitive` / `Dossier refusé`

---

## [0.3.0] — April 2026 (Phase 3: Authentication)

### Added
- Supabase Auth email/password registration and login
- Email confirmation flow (`/apply/confirm-email`)
- Auth callback route (`/auth/callback`)
- Middleware route protection (applicant and admin routes)
- Admin login page (`/admin/login`)

---

## [0.2.0] — April 2026 (Phase 2: Database & Schema)

### Added
- PostgreSQL schema: 7 tables with UUID PKs, RLS, USD CHECK constraints
- `generate_applicant_id()` function: `IGN-YYYY-NNNNN` format
- Supabase Storage buckets: `documents` and `admission-letters` (no video bucket)
- Row Level Security policies for all tables
- Seed data: intake year 2026, admin placeholder

---

## [0.1.0] — April 2026 (Phase 1: Project Foundation)

### Added
- Next.js 14 App Router scaffold with TypeScript
- Tailwind CSS + shadcn/ui design system
- Crimson Pro (serif headings) + Inter (sans body) typography
- Design tokens: Navy `#031463`, Light Blue `#4EA6F5`, Off-White `#F8FAFC`
- `vercel.json` configuration (region, headers, redirects, rewrites)
- `next.config.js` with image optimization and canonical host redirect
- `sitemap.ts`, `robots.ts` for SEO
- `.env.example` with full environment variable documentation
- Vitest configuration (unit, property, component test projects)
- Playwright configuration for E2E tests
