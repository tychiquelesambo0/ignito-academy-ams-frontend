# Implementation Tasks: Ignito Academy AMS Migration and Enhancement

## Document Information

**Version:** 1.0  
**Created:** 2026-04-09  
**Status:** Ready for Implementation  
**Based on:** Requirements v2.1 (APPROVED) + Design v1.0 (APPROVED)

## Task Overview

This document breaks down the implementation into manageable tasks organized by feature area. Each task includes acceptance criteria and dependencies.

---

## Phase 1: Foundation and Infrastructure Setup

### Task 1: Project Setup and Configuration
**Priority:** Critical  
**Estimated Effort:** 2-4 hours

- [x] 1.1 Initialize Next.js 14+ project with TypeScript
- [x] 1.2 Install and configure dependencies (Supabase, Tailwind, Zod, etc.)
- [x] 1.3 Set up environment variables (.env.example, .env.local)
- [x] 1.4 Configure ESLint with OTHM keyword prohibition rule
- [x] 1.5 Set up pre-commit hooks (Husky) with OTHM scanner
- [x] 1.6 Configure TypeScript strict mode
- [x] 1.7 Set up folder structure (src/app, src/lib, src/components)

**Acceptance Criteria:**
- Project builds without errors
- ESLint detects "OTHM" keyword and fails
- Pre-commit hook blocks commits containing "OTHM"
- All environment variables documented in .env.example

**Dependencies:** None

---

### Task 2: Supabase Project Setup
**Priority:** Critical  
**Estimated Effort:** 3-5 hours


- [x] 2.1 Create Supabase project (Europe region) ✅ 2026-04-10
- [x] 2.2 Configure Supabase CLI locally ✅ 2026-04-10
- [x] 2.3 Initialize Supabase migrations folder ✅ 2026-04-10
- [x] 2.4 Create database migration script (20260410000001_ams_schema.sql) ✅ 2026-04-10
- [x] 2.5 Run migrations to create all tables ✅ 2026-04-10
- [x] 2.6 Enable Row Level Security on all tables ✅ 2026-04-10
- [x] 2.7 Create RLS policies for applicants and admissions officers ✅ 2026-04-10
- [x] 2.8 Create storage buckets (pieces_justificatives, official_letters) ✅ 2026-04-10
- [x] 2.9 Configure storage RLS policies (CRITICAL: pieces_justificatives INSERT policy must verify payment_status is 'Confirmed' or 'Waived') ✅ 2026-04-10
- [x] 2.10 Seed initial data (intake year, test admin account, document types) ✅ 2026-04-10

**Acceptance Criteria:**
- All tables created with correct schema
- RLS enabled and policies tested
- Storage buckets created with correct configuration
- Test admin can log in
- Applicants cannot access other applicants' data

**Dependencies:** Task 1

---

### Task 3: Authentication Setup (Supabase Auth ONLY)
**Priority:** Critical  
**Estimated Effort:** 2-3 hours

- [x] 3.1 Configure Supabase Auth settings ✅ 2026-04-10
- [x] 3.2 Create auth utility functions (src/lib/supabase/auth.ts) ✅ 2026-04-10
- [x] 3.3 Implement signUpApplicant() using `supabase.auth.signUp()` ✅ 2026-04-10
- [x] 3.4 Implement signIn() using `supabase.auth.signInWithPassword()` ✅ 2026-04-10
- [x] 3.5 Implement signOut() using `supabase.auth.signOut()` ✅ 2026-04-10
- [x] 3.6 Implement resetPassword() using `supabase.auth.resetPasswordForEmail()` ✅ 2026-04-10
- [x] 3.7 Create middleware using `supabase.auth.getUser()` (NOT getSession()) ✅ 2026-04-10
- [x] 3.8 Protect /dashboard routes (applicant authentication required) ✅ 2026-04-10
- [x] 3.9 Protect /admin routes (admin role required) ✅ 2026-04-10
- [x] 3.10 Verify NO manual password hashing in codebase (no bcrypt imports) ✅ 2026-04-10

**Acceptance Criteria:**
- ALL authentication via Supabase Auth methods
- Middleware uses getUser() for server-side validation
- NO manual password hashing (bcrypt, argon2, scrypt)
- NO custom JWT generation
- NO custom session management
- Password reset flow uses Supabase Auth
- Protected routes redirect unauthenticated users
- Admin routes check for admissions_officer role

**Dependencies:** Task 2

---

## Phase 2: Payment Provider Abstraction

### Task 4: Payment Provider Interface and Factory
**Priority:** High  
**Estimated Effort:** 3-4 hours

- [x] 4.1 Create payment types (src/lib/payment/types.ts)
- [x] 4.2 Define IPaymentProvider interface
- [x] 4.3 Create PaymentProviderFactory class
- [x] 4.4 Implement factory getProvider() method
- [x] 4.5 Add environment variable check (PAYMENT_PROVIDER)

**Acceptance Criteria:**
- IPaymentProvider interface defines all required methods
- Factory returns correct provider based on env variable
- Factory defaults to MockPaymentProvider if not configured

**Dependencies:** Task 1

---

### Task 5: Mock Payment Provider Implementation
**Priority:** High  
**Estimated Effort:** 2-3 hours


- [x] 5.1 Create MockPaymentProvider class
- [x] 5.2 Implement initiatePayment() (instant success simulation)
- [x] 5.3 Implement verifyWebhook() (always returns true)
- [x] 5.4 Implement processRefund() (not needed - using interface methods)
- [x] 5.5 Implement getTransactionStatus() (auto-confirm after 3 seconds)
- [x] 5.6 Add console logging for debugging

**Acceptance Criteria:**
- Mock provider works in development mode
- Payment initiation returns mock transaction ID
- Enhanced logging for all operations
- Auto-confirmation after 3 seconds
- Webhook verification always succeeds
- Transaction status changes to Confirmed after 3 seconds

**Dependencies:** Task 4

---

### Task 6: Pawa Pay Provider Implementation
**Priority:** High  
**Estimated Effort:** 5-7 hours

- [x] 6.1 Create PawaPayProvider class
- [x] 6.2 Implement initiatePayment() with Pawa Pay API
- [x] 6.3 Map provider names to Pawa Pay correspondent codes
- [x] 6.4 Convert amount to minor units (cents/centimes)
- [x] 6.5 Implement verifyWebhook() with HMAC-SHA256
- [x] 6.6 Implement processRefund() with Pawa Pay refunds API
- [x] 6.7 Implement getTransactionStatus() with Pawa Pay deposits API
- [x] 6.8 Add error handling and logging
- [x] 6.9 Test with Pawa Pay sandbox environment

**Acceptance Criteria:**
- Payment initiation calls Pawa Pay API successfully
- Webhook signature verification works correctly
- Refunds can be processed
- Auto-detection of mobile money provider from phone number
- HMAC-SHA256 webhook validation
- Comprehensive error handling and logging
- Transaction status can be queried
- Errors are handled gracefully with French messages

**Dependencies:** Task 4

---

### Task 7: USD Single-Currency Enforcement
**Priority:** Critical  
**Estimated Effort:** 2-3 hours
**Status:** ✅ COMPLETE

- [x] 7.1 Create currency utility (src/lib/payment/currency.ts)
- [x] 7.2 Define Currency type as single literal: `export type Currency = 'USD';`
- [x] 7.3 Define APPLICATION_FEE_USD constant (29 USD)
- [x] 7.4 Create validateCurrency() function (rejects non-USD)
- [x] 7.5 Create validatePaymentAmount() function (must equal 29 USD)
- [x] 7.6 Add database migration for USD-only constraints
- [x] 7.7 Test that non-USD payments are rejected

**Acceptance Criteria:**
- Currency type is single literal 'USD' (NOT union type)
- Application fee hardcoded at 29 USD
- Database constraints enforce USD-only payments
- Webhook handler rejects non-USD payments
- No CDF references anywhere in codebase
- No exchange rate API integration
- No currency conversion functions

**Dependencies:** Task 4

---

## Phase 3: Scholarship System

### Task 8: Scholarship Eligibility Calculation
**Priority:** High  
**Estimated Effort:** 3-4 hours
**Status:** ✅ COMPLETE

- [x] 8.1 Create eligibility utility (src/lib/scholarship/eligibility.ts)
- [x] 8.2 Implement calculateAge() with September 1st anchor
- [x] 8.3 Implement calculateScholarshipEligibility() function
- [x] 8.4 Check all grade averages >= 70%
- [x] 8.5 Check age < 20 on September 1st of intake year
- [x] 8.6 Check graduation year >= 2024
- [x] 8.7 Return detailed reasons for ineligibility
- [x] 8.8 Implement hasReachedScholarshipLimit() function

**Acceptance Criteria:**
- Eligibility calculated correctly based on grades, age, graduation year
- Age calculated relative to September 1st (not current date)
- English proficiency NOT considered in eligibility
- Maximum 20 scholarships per year enforced
- Detailed reasons provided for ineligibility

**Dependencies:** Task 2

---

### Task 9: Video URL Validation (NO File Uploads)
**Priority:** High  
**Estimated Effort:** 2-3 hours
**Status:** ✅ COMPLETE

- [x] 9.1 Create video validation utility (src/lib/scholarship/video-validation.ts)
- [x] 9.2 Implement validateVideoURL() function
- [x] 9.3 Add YouTube URL regex patterns (watch, youtu.be, embed, shorts)
- [x] 9.4 Add Vimeo URL regex patterns (standard, player)
- [x] 9.5 Extract video ID and generate embed URL
- [x] 9.6 Create Zod schema for video URL validation
- [x] 9.7 Test with various URL formats
- [x] 9.8 Verify NO video file upload functionality exists

**Acceptance Criteria:**
- YouTube URLs validated correctly (including unlisted)
- Vimeo URLs validated correctly
- Embed URLs generated for iframe display
- Invalid URLs rejected with clear error message
- NO video file upload UI components
- NO video storage bucket created
- NO video file validation (size, format, duration)
- Video URLs stored as TEXT in scholarship_video_url column

**Dependencies:** None

---

### Task 10: Scholarship UI Components (URL Input ONLY)
**Priority:** Medium  
**Estimated Effort:** 4-5 hours
**Status:** ✅ COMPLETE

- [x] 10.1 Create ScholarshipVideoInput component (text input, NOT file upload)
- [x] 10.2 Add video URL text input field (type="url")
- [x] 10.3 Implement real-time URL validation
- [x] 10.4 Show video preview on valid URL (iframe embed)
- [x] 10.5 Display validation errors in French
- [x] 10.6 Create ScholarshipVideoPlayer component (admin)
- [x] 10.7 Embed video using iframe
- [x] 10.8 Display raw URL as clickable link
- [x] 10.9 Handle invalid URLs gracefully
- [x] 10.10 Verify NO file upload input elements exist

**Acceptance Criteria:**
- Applicants can paste YouTube/Vimeo URLs in text input
- Video preview appears on valid URL (iframe)
- Admins can watch embedded videos
- NO file upload UI present (no <input type="file" accept="video/*">)
- NO video file validation logic
- NO video storage bucket references

**Dependencies:** Task 9

---

## Phase 4: Frontend Implementation

### Task 11: Input Validation and Sanitization
**Priority:** High  
**Estimated Effort:** 3-4 hours
**Status:** ✅ COMPLETE

- [x] 11.1 Create validation schemas (src/lib/validation/schemas.ts)
- [x] 11.2 Implement sanitizePhoneNumber() utility
- [x] 11.3 Create profileSchema with phone sanitization
- [x] 11.4 Create academicHistorySchema with grade validation
- [x] 11.5 Create videoURLSchema (already in Task 9)
- [x] 11.6 Add OTHM keyword detection in text fields
- [x] 11.7 Test phone number sanitization (081XXXXXXX → +243XXXXXXXXX)

**Acceptance Criteria:**
- Phone numbers auto-sanitized from local to E.164 format
- All grade fields validated (0-100 range)
- OTHM keyword rejected in form inputs
- Validation errors displayed in French

**Dependencies:** None

---

### Task 12: Applicant Dashboard Pages
**Priority:** High  
**Estimated Effort:** 8-10 hours

- [x] 12.1 Create dashboard layout (src/app/dashboard/layout.tsx) ✅ 2026-04-13
- [x] 12.2 Create dashboard home page ✅ 2026-04-13
- [x] 12.3 Create profile form page ✅ 2026-04-13
- [x] 12.4 Create academic history form page ✅ 2026-04-13
- [x] 12.5 Create payment page (PawaPay integration, active reconciliation, dossier lock) ✅ 2026-04-13
- [x] 12.6 Create document upload page ✅ 2026-04-13
- [x] 12.7 Create scholarship application page (conditional) ✅ 2026-04-13
- [x] 12.8 Implement ApplicationContext for state management ✅ 2026-04-13
- [x] 12.9 Add Supabase Realtime subscriptions ✅ 2026-04-13
- [x] 12.10 Display application status badges ✅ 2026-04-13

**Acceptance Criteria:**
- All dashboard pages accessible to authenticated applicants
- Forms validate input correctly
- Application state updates in real-time
- Scholarship page only visible to eligible applicants

**Dependencies:** Task 3, Task 8, Task 11

---

### Task 13: Admin Dashboard Pages
**Priority:** High  
**Estimated Effort:** 8-10 hours


- [ ] 13.1 Create admin layout (src/app/admin/layout.tsx)
- [ ] 13.2 Create applications list page with pagination
- [ ] 13.3 Create application details page
- [ ] 13.4 Create scholarship management page
- [ ] 13.5 Create decision modal component
- [ ] 13.6 Create refund interface
- [ ] 13.7 Implement ApplicationTable component
- [ ] 13.8 Add filtering by status
- [ ] 13.9 Add sorting by date/grades
- [ ] 13.10 Display scholarship counter (X/20 awarded)

**Acceptance Criteria:**
- Admins can view all applications
- Applications paginated (50 per page)
- Admins can filter and sort applications
- Scholarship applicants displayed separately
- Video player works in admin view

**Dependencies:** Task 3, Task 10

---

## Phase 5: API Routes and Edge Functions

### Task 14: Payment API Routes
**Priority:** High  
**Estimated Effort:** 4-5 hours

- [ ] 14.1 Create payment initiation route (POST /api/payment/initiate)
- [ ] 14.2 Validate request with Zod schema
- [ ] 14.3 Sanitize phone number before payment
- [ ] 14.4 Call PaymentProviderFactory.getProvider()
- [ ] 14.5 Initiate payment with provider
- [ ] 14.6 Update application with transaction ID
- [ ] 14.7 Create payment status route (GET /api/payment/status)
- [ ] 14.8 Add error handling with French messages

**Acceptance Criteria:**
- Payment can be initiated via API
- Phone numbers sanitized automatically
- Transaction ID stored in database
- Payment status can be queried
- Errors returned with user-friendly messages

**Dependencies:** Task 6, Task 11

---

### Task 15: Webhook Handler (USD Validation Critical)
**Priority:** Critical  
**Estimated Effort:** 4-5 hours

- [ ] 15.1 Create webhook route (POST /api/webhooks/payment)
- [ ] 15.2 Verify webhook signature (HMAC-SHA256)
- [ ] 15.3 **CRITICAL: Validate currency = 'USD'** (reject if not USD)
- [ ] 15.4 **CRITICAL: Validate amount = 2900 cents (29 USD)** (reject if not 29)
- [ ] 15.5 Check for duplicate webhooks (idempotency)
- [ ] 15.6 Log webhook in webhook_logs table
- [ ] 15.7 Update application payment_status
- [ ] 15.8 Update application_status based on payment
- [ ] 15.9 Send confirmation email on success
- [ ] 15.10 Handle webhook errors gracefully
- [ ] 15.11 Return 400 error for non-USD payments

**Acceptance Criteria:**
- Webhooks verified with signature
- **Non-USD payments rejected immediately**
- **Payments not equal to 29 USD rejected**
- Duplicate webhooks ignored
- Payment status updated correctly
- Confirmation emails sent
- All webhooks logged for audit
- Error responses include reason for rejection

**Dependencies:** Task 6, Task 7, Task 14

---

### Task 16: Supabase Edge Functions
**Priority:** High  
**Estimated Effort:** 6-8 hours

- [ ] 16.1 Create payment-webhook Edge Function
- [ ] 16.2 Create scholarship-eligibility Edge Function
- [ ] 16.3 Create admin-decision Edge Function (PDF generation)
- [ ] 16.4 Implement atomic operations with rollback
- [ ] 16.5 Add email sending via Resend
- [ ] 16.6 Deploy Edge Functions to Supabase
- [ ] 16.7 Configure environment variables
- [ ] 16.8 Test Edge Functions

**Acceptance Criteria:**
- Edge Functions deployed and accessible
- PDF generation works correctly
- Emails sent successfully
- Atomic operations rollback on failure
- All functions have proper error handling

**Dependencies:** Task 2, Task 15

---

## Phase 6: Testing

### Task 17: Unit Tests
**Priority:** High  
**Estimated Effort:** 8-10 hours


- [ ] 17.1 Test payment provider abstraction
- [ ] 17.2 Test Pawa Pay provider (with mocks)
- [ ] 17.3 Test scholarship eligibility calculation
- [ ] 17.4 Test age calculation with September 1st anchor
- [ ] 17.5 Test video URL validation
- [ ] 17.6 Test phone number sanitization
- [ ] 17.7 Test email template rendering
- [ ] 17.8 Test file upload validation
- [ ] 17.9 Achieve 90%+ code coverage

**Acceptance Criteria:**
- All utility functions have unit tests
- Edge cases covered
- 90%+ code coverage achieved
- All tests pass in CI/CD

**Dependencies:** Tasks 4-11

---

### Task 18: Property-Based Tests (Four Pillars Validation)
**Priority:** High  
**Estimated Effort:** 6-8 hours

- [ ] 18.1 Install fast-check library
- [ ] 18.2 Implement Property P46 (Payment provider abstraction)
- [ ] 18.3 Implement Property P47 (Payment status consistency)
- [ ] 18.4 Implement Property P48 (Scholarship eligibility - qualifying)
- [ ] 18.5 Implement Property P49 (Scholarship eligibility - exclusion)
- [ ] 18.6 Implement Property P50 (Scholarship award limit)
- [ ] 18.7 Implement Property P51 (Payment waiver on award)
- [ ] 18.8 Implement Property P52 (Video URL submission eligibility)
- [ ] 18.9 Implement Property P53 (Grade range validation)
- [ ] 18.10 Implement Property P54 (Graduation year validation)
- [ ] 18.11 Implement Property P55 (Webhook signature verification)
- [ ] 18.12 Implement Property P56 (Refund transaction recording)
- [ ] 18.13 Implement Property P57 (Video URL format validation - YouTube/Vimeo)
- [ ] 18.14 Implement Property P58 (Video URL storage format - TEXT column)
- [ ] 18.15 Implement Property P59 (Scholarship status transitions)
- [ ] 18.16 Implement Property P60 (Age calculation consistency - Sept 1st)
- [ ] 18.17 Implement Property P61 (OTHM keyword prohibition)
- [ ] 18.18 **NEW: Property P62 (USD single-currency enforcement)**
- [ ] 18.19 **NEW: Property P63 (No manual password hashing)**
- [ ] 18.20 **NEW: Property P64 (No video file upload functionality)**
- [ ] 18.21 **NEW: Property P65 (Supabase Auth exclusive usage)**

**Acceptance Criteria:**
- All 65 correctness properties implemented
- Each property runs 100+ iterations
- All properties pass
- Properties tagged with feature name and number
- **Four architectural pillars validated via properties**
- USD-only payments enforced
- OTHM keyword detection works
- Supabase Auth exclusively used
- Video URLs (not files) validated

**Dependencies:** Tasks 4-11

---

### Task 19: Integration Tests
**Priority:** Medium  
**Estimated Effort:** 6-8 hours

- [ ] 19.1 Test complete applicant registration flow
- [ ] 19.2 Test payment webhook processing end-to-end
- [ ] 19.3 Test admin decision workflow
- [ ] 19.4 Test scholarship eligibility detection
- [ ] 19.5 Test video URL submission
- [ ] 19.6 Test concurrent edit detection
- [ ] 19.7 Test email retry logic
- [ ] 19.8 Test document file upload with RLS (Verify NO video uploads are possible)
- [ ] 19.9 Test refund processing
- [ ] 19.10 Clean up test data after each test

**Acceptance Criteria:**
- All critical workflows tested end-to-end
- Tests use test database
- Test data cleaned up automatically
- All integration tests pass

**Dependencies:** Tasks 12-16

---

### Task 20: E2E Tests
**Priority:** Medium  
**Estimated Effort:** 8-10 hours

- [ ] 20.1 Install and configure Playwright
- [ ] 20.2 Test applicant registration and login
- [ ] 20.3 Test academic history form submission
- [ ] 20.4 Test payment initiation (mock mode)
- [ ] 20.5 Test document upload
- [ ] 20.6 Test scholarship application (eligible)
- [ ] 20.7 Test scholarship section hidden (ineligible)
- [ ] 20.8 Test admin login and application review
- [ ] 20.9 Test admin decision making
- [ ] 20.10 Test admin scholarship award
- [ ] 20.11 Test on Chrome, Firefox, Safari
- [ ] 20.12 Test responsive design (mobile/desktop)

**Acceptance Criteria:**
- Complete user journeys tested
- Tests run on multiple browsers
- Responsive design verified
- Screenshots captured on failures
- All E2E tests pass

**Dependencies:** Tasks 12-16

---

## Phase 7: Security and Performance

### Task 21: Security Hardening
**Priority:** Critical  
**Estimated Effort:** 4-6 hours


- [ ] 21.1 Configure Content Security Policy headers
- [ ] 21.2 Implement rate limiting on payment endpoints
- [ ] 21.3 Implement rate limiting on document file uploads (PDF/Images only)
- [ ] 21.4 Add CSRF protection
- [ ] 21.5 Sanitize all user inputs
- [ ] 21.6 Test RLS policies with different roles
- [ ] 21.7 Conduct security audit
- [ ] 21.8 Fix any vulnerabilities found
- [ ] 21.9 Document security measures

**Acceptance Criteria:**
- CSP headers configured correctly
- Rate limiting prevents abuse
- CSRF protection active
- All inputs sanitized
- RLS policies prevent unauthorized access
- Security audit passed

**Dependencies:** Tasks 2, 12-16

---

### Task 22: Performance Optimization
**Priority:** Medium  
**Estimated Effort:** 4-6 hours

- [ ] 22.1 Implement code splitting for routes
- [ ] 22.2 Lazy load heavy components
- [ ] 22.3 Optimize images with Next.js Image
- [ ] 22.4 Add database indexes
- [ ] 22.5 Implement pagination for admin table
- [ ] 22.6 Test landing page load time (< 2s on 3G)
- [ ] 22.7 Test dashboard load time (< 1s on 4G)
- [ ] 22.8 Test webhook processing (< 500ms)
- [ ] 22.9 Test PDF generation (< 3s)

**Acceptance Criteria:**
- Landing page loads in < 2 seconds on 3G
- Dashboard loads in < 1 second on 4G
- Webhook processing < 500ms
- PDF generation < 3 seconds
- Database queries < 100ms (p95)

**Dependencies:** Tasks 12-16

---

### Task 23: Monitoring and Observability
**Priority:** Medium  
**Estimated Effort:** 4-5 hours

- [ ] 23.1 Integrate Sentry for error tracking
- [ ] 23.2 Create MetricsCollector class
- [ ] 23.3 Track payment metrics
- [ ] 23.4 Track scholarship metrics
- [ ] 23.5 Track application metrics
- [ ] 23.6 Create health check endpoint
- [ ] 23.7 Set up alerts for critical errors
- [ ] 23.8 Create monitoring dashboards
- [ ] 23.9 Implement structured logging

**Acceptance Criteria:**
- Errors tracked in Sentry
- Key metrics collected
- Health check endpoint responds
- Alerts configured for critical issues
- Dashboards show system health

**Dependencies:** Tasks 12-16

---

## Phase 8: Deployment and Documentation

### Task 24: Deployment Configuration
**Priority:** Critical  
**Estimated Effort:** 4-6 hours

- [ ] 24.1 Configure Vercel project
- [ ] 24.2 Set up custom domain (admissions.ignitoacademy.com)
- [ ] 24.3 Configure SSL certificate
- [ ] 24.4 Set up environment variables in Vercel
- [ ] 24.5 Configure Supabase production project
- [ ] 24.6 Run production database migrations
- [ ] 24.7 Deploy Edge Functions to production
- [ ] 24.8 Configure Pawa Pay production credentials
- [ ] 24.9 Set up CI/CD pipeline (GitHub Actions)
- [ ] 24.10 Configure automated backups

**Acceptance Criteria:**
- Application deployed to production
- Custom domain configured with SSL
- All environment variables set
- Database migrations run successfully
- CI/CD pipeline runs on every push
- Automated backups configured

**Dependencies:** All previous tasks

---

### Task 25: Documentation
**Priority:** High  
**Estimated Effort:** 6-8 hours

- [ ] 25.1 Write README.md with setup instructions
- [ ] 25.2 Document all environment variables
- [ ] 25.3 Create API documentation
- [ ] 25.4 Document database schema
- [ ] 25.5 Create admin user guide
- [ ] 25.6 Create applicant user guide
- [ ] 25.7 Write troubleshooting guide
- [ ] 25.8 Document deployment process
- [ ] 25.9 Create CHANGELOG.md
- [ ] 25.10 Document OTHM prohibition enforcement

**Acceptance Criteria:**
- README complete with setup instructions
- All environment variables documented
- API endpoints documented
- User guides available in French
- Troubleshooting guide covers common issues

**Dependencies:** Task 24

---

### Task 26: User Acceptance Testing (UAT)
**Priority:** Critical  
**Estimated Effort:** 8-10 hours


- [ ] 26.1 Conduct applicant flow UAT
- [ ] 26.2 Conduct admin flow UAT
- [ ] 26.3 Test payment with real Pawa Pay sandbox
- [ ] 26.4 Test scholarship application flow
- [ ] 26.5 Test email notifications
- [ ] 26.6 Test PDF generation
- [ ] 26.7 Test on mobile devices
- [ ] 26.8 Collect feedback from test users
- [ ] 26.9 Fix any issues found
- [ ] 26.10 Get final approval from stakeholders

**Acceptance Criteria:**
- All user flows tested by real users
- Payment works with Pawa Pay sandbox
- Emails delivered successfully
- PDFs generated correctly
- Mobile experience acceptable
- All critical issues resolved
- Stakeholder approval obtained

**Dependencies:** Task 24

---

## Task Summary

### Total Tasks: 26
### Total Estimated Effort: 120-160 hours (3-4 weeks for 1 developer)

### Critical Path:
1. Project Setup (Tasks 1-3)
2. Payment System (Tasks 4-7, 14-15)
3. Scholarship System (Tasks 8-10)
4. Frontend (Tasks 11-13)
5. Testing (Tasks 17-20)
6. Deployment (Tasks 24-26)

### Priority Breakdown:
- **Critical:** 7 tasks (Foundation, Auth, Webhook, Security, Deployment, UAT)
- **High:** 13 tasks (Payment, Scholarship, Frontend, API, Testing)
- **Medium:** 6 tasks (Currency, UI, Integration, E2E, Performance, Monitoring)

---

## Implementation Notes

### Development Workflow:
1. Create feature branch for each task
2. Implement task with tests
3. Run linter and OTHM scanner
4. Submit PR for code review
5. Merge to develop branch
6. Deploy to staging for testing
7. Merge to main for production deployment

### Testing Strategy:
- Write tests alongside implementation
- Run unit tests on every commit
- Run integration tests on PR
- Run E2E tests before deployment
- Maintain 90%+ code coverage

### Code Review Checklist:
- [ ] No "OTHM" keyword present
- [ ] All tests passing
- [ ] Code follows TypeScript best practices
- [ ] Error messages in French
- [ ] Security considerations addressed
- [ ] Performance acceptable
- [ ] Documentation updated

---

## Risk Mitigation

### High-Risk Areas:
1. **Pawa Pay Integration** - Test thoroughly with sandbox before production
2. **Webhook Signature Verification** - Critical for security, must be bulletproof
3. **Age Calculation Logic** - September 1st anchor must be correct
4. **Phone Number Sanitization** - Must handle all DRC formats
5. **RLS Policies** - Must prevent unauthorized data access

### Contingency Plans:
- **Payment Provider Failure:** Fall back to MockPaymentProvider temporarily
- **Email Service Failure:** Queue emails for retry with exponential backoff
- **Database Migration Issues:** Have rollback scripts ready
- **Performance Issues:** Implement caching and optimize queries
- **Security Vulnerabilities:** Have incident response plan ready

---

## Success Criteria

The implementation will be considered successful when:

1. ✅ All 26 tasks completed
2. ✅ All 65 correctness properties pass (including 4 pillars validation)
3. ✅ 90%+ code coverage achieved
4. ✅ All E2E tests pass on Chrome, Firefox, Safari
5. ✅ Security audit passed
6. ✅ Performance benchmarks met
7. ✅ UAT completed with stakeholder approval
8. ✅ Production deployment successful
9. ✅ **Zero "OTHM" keyword occurrences** in entire system
10. ✅ **All payments in USD only** (no CDF, no exchange rates)
11. ✅ **All authentication via Supabase Auth** (no manual password hashing)
12. ✅ **Video URL submission working** (no video file uploads)
13. ✅ Documentation complete

---

**Document Status:** ✅ READY FOR IMPLEMENTATION  
**Next Steps:** Begin Task 1 (Project Setup and Configuration)

