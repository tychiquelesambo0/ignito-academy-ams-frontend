# Requirements Document: Ignito Academy AMS Migration and Enhancement

## Introduction

This document specifies requirements for migrating and enhancing the existing Ignito Academy Admission Management System (AMS). The project involves:

1. **Payment Provider Migration**: Replace Nomba API with Pawa Pay for mobile money transactions
2. **Payment Provider Abstraction**: Implement a payment provider abstraction layer for easy switching
3. **Bourse d'Excellence Integration**: Add scholarship eligibility filtering and application workflow
4. **Supabase Backend Setup**: Create complete backend infrastructure from scratch
5. **Domain Configuration**: Deploy to admissions.ignitoacademy.com
6. **Production Readiness**: Comprehensive testing, edge case handling, and monitoring

## Project Context

### Current State
- Existing Next.js 14+ frontend with comprehensive UI components
- Nomba API integration for payments (hardcoded)
- Basic scholarship database schema exists
- Comprehensive test suite (unit, property-based, E2E)
- Documentation (PRD, Infrastructure Design)

### Target State
- Pawa Pay integration with provider abstraction layer
- Fully functional scholarship eligibility and application system
- Complete Supabase backend (database, RLS policies, Edge Functions, storage)
- Production-ready deployment at admissions.ignitoacademy.com
- 100% test coverage including edge cases

## Critical Architectural Constraints (Non-Negotiable)

### 1. OTHM Negative Constraint
**STRICTLY PROHIBITED**: The keyword "OTHM" MUST NOT appear anywhere in:
- Codebase (comments, variables, functions, classes)
- Frontend UI (text, labels, placeholders, tooltips)
- Database schema (table names, column names, comments, data)
- Configuration files and environment variables
- Email templates and PDF documents
- API endpoints and responses
- Documentation (except this constraint warning)

**Rationale**: White-labeling and intellectual property protection.

**Enforcement**: Automated linting/scanning in CI/CD pipeline to detect and prevent "OTHM" usage.

**Alternative**: Use "UK Level 3 Foundation Diploma" as the qualification reference.

### 2. Scholarship Eligibility: No English Proficiency Filter
**Constraint**: Scholarship eligibility is determined ONLY by:
- Academic grades (Grade 10, 11, 12, Exetat >= 70%)
- Age (< 20 years)
- Graduation year (>= 2024)

**Prohibited**: Do NOT add English proficiency tests (IELTS, CEFR, etc.) as eligibility criteria.

**Rationale**: Intensive English program is handled separately and does not block scholarship eligibility.

### 3. No Moodle LMS Integration
**Constraint**: Do NOT design or implement:
- API integrations with Moodle LMS
- Edge Functions for automated student provisioning
- Automated enrollment workflows

**Rationale**: The link between AMS (Admitta) and Moodle Campus will be handled manually by admissions team.

**Scope**: This version focuses on admission management only, not LMS integration.

### 4. Supabase Auth Only (No Manual Password Hashing)
**Constraint**: ALL authentication, password management, session handling, and JWT generation MUST use Supabase Auth natively.

**Prohibited**: Do NOT implement manual password hashing (bcrypt or otherwise).

**Rationale**: Leverage Supabase's battle-tested authentication system for security and maintainability.

### 5. Video URLs Not Uploads
**Constraint**: Scholarship applicants MUST submit video URLs (YouTube/Vimeo), NOT upload video files.

**Prohibited**: 
- Do NOT create Supabase Storage bucket for videos
- Do NOT implement video file upload UI
- Do NOT validate video file size/format

**Rationale**: Reduce server costs and accommodate DRC bandwidth limitations.

**Implementation**: Validate URL format using regex, embed videos via iframe in admin dashboard.

## Glossary

- **AMS**: Admission Management System (also known as "Admitta")
- **Bourse d'Excellence**: Scholarship program offering tuition waiver + 50 USD/month stipend
- **Pawa Pay**: Mobile money payment gateway for DRC (M-Pesa, Orange Money, Airtel Money)
- **Payment Provider Abstraction**: Design pattern allowing easy switching between payment gateways
- **Scholarship Eligibility**: Automatic filtering based on grades, age, and graduation year (no English proficiency requirement)
- **Video Pitch**: 2-minute video hosted externally (YouTube/Vimeo) with URL submitted by applicant
- **RLS**: Row Level Security (Supabase database security feature)
- **UK Level 3 Foundation Diploma**: The qualification pathway supported by this system
- **OTHM**: STRICTLY PROHIBITED keyword that MUST NOT appear anywhere in codebase, UI, database, or documentation


## Requirements

### Category 1: Payment Provider Abstraction

#### Requirement 1.1: Payment Provider Interface

**User Story:** As a system architect, I want a payment provider abstraction layer, so that we can switch between payment gateways without changing the entire codebase.

**Acceptance Criteria:**

1. THE AMS SHALL define a PaymentProvider interface with methods: `initiatePayment()`, `verifyWebhook()`, `processRefund()`, `getTransactionStatus()`
2. THE AMS SHALL implement a PawaPayProvider class that implements the PaymentProvider interface
3. THE AMS SHALL implement a MockPaymentProvider class for development/testing
4. THE AMS SHALL use environment variable `PAYMENT_PROVIDER` to determine which provider to use (values: 'pawapay', 'mock')
5. THE AMS SHALL use a factory pattern to instantiate the correct payment provider based on configuration
6. WHEN switching payment providers, THE AMS SHALL require only environment variable changes, not code changes
7. THE AMS SHALL maintain consistent payment status values ('Pending', 'Confirmed', 'Failed', 'Waived') across all providers

#### Requirement 1.2: Pawa Pay Integration

**User Story:** As an applicant, I want to pay the application fee using Pawa Pay mobile money, so that I can complete my application submission.

**Acceptance Criteria:**

1. THE AMS SHALL integrate with Pawa Pay API for payment initiation
2. THE AMS SHALL support M-Pesa, Orange Money, and Airtel Money through Pawa Pay
3. WHEN an applicant initiates payment, THE AMS SHALL call Pawa Pay's payment initiation endpoint with applicant_id, amount (29 USD), and provider
4. THE AMS SHALL receive and store Pawa Pay's transaction reference (depositId)
5. THE AMS SHALL provide a webhook endpoint for Pawa Pay payment callbacks
6. WHEN Pawa Pay sends a success webhook, THE AMS SHALL update payment_status to 'Confirmed'
7. WHEN Pawa Pay sends a failure webhook, THE AMS SHALL update payment_status to 'Failed'
8. THE AMS SHALL verify Pawa Pay webhook signatures using the API secret
9. THE AMS SHALL log all Pawa Pay API requests and responses for debugging
10. THE AMS SHALL handle Pawa Pay API errors gracefully with user-friendly French error messages


#### Requirement 1.3: Payment Refund Support

**User Story:** As an admissions officer, I want to process refunds for special cases, so that we can handle exceptional circumstances.

**Acceptance Criteria:**

1. THE AMS SHALL provide a refund interface in the admin dashboard
2. WHEN an admin initiates a refund, THE AMS SHALL call the payment provider's refund method
3. THE AMS SHALL support full refunds only (29 USD)
4. THE AMS SHALL record refund transactions in the database with admin_id, applicant_id, amount, reason, and timestamp
5. WHEN a refund is processed, THE AMS SHALL update payment_status to 'Refunded'
6. THE AMS SHALL send an email notification to the applicant when refund is processed
7. THE AMS SHALL prevent document uploads and status changes for refunded applications

### Category 2: Bourse d'Excellence (Scholarship System)

#### Requirement 2.1: Automatic Scholarship Eligibility Detection

**User Story:** As an applicant, I want the system to automatically determine if I'm eligible for the scholarship, so that I can apply if I qualify.

**Acceptance Criteria:**

1. THE AMS SHALL calculate scholarship eligibility based on the following criteria ONLY:
   - Grade 10 average >= 70%
   - Grade 11 average >= 70%
   - Grade 12 average >= 70%
   - Examen d'état percentage >= 70%
   - Graduation year >= 2024
   - Age < 20 years at time of application
2. THE AMS SHALL NOT require English proficiency tests (IELTS, CEFR, etc.) as a scholarship eligibility criterion
3. THE AMS SHALL handle Intensive English program enrollment separately from scholarship eligibility
4. WHEN an applicant completes the academic history form, THE AMS SHALL automatically evaluate eligibility
5. THE AMS SHALL set `is_scholarship_eligible` to TRUE if all criteria are met
6. THE AMS SHALL set `is_scholarship_eligible` to FALSE if any criterion is not met
7. THE AMS SHALL display the scholarship application interface ONLY to eligible applicants
8. THE AMS SHALL hide the scholarship application interface from non-eligible applicants
9. THE AMS SHALL recalculate eligibility if academic history is updated before payment


#### Requirement 2.2: Academic History Form Enhancement

**User Story:** As an applicant, I want to provide my grade averages and graduation year, so that the system can determine my scholarship eligibility.

**Acceptance Criteria:**

1. THE AMS SHALL add the following fields to the academic history form:
   - Grade 10 Average (percentage, 0-100)
   - Grade 11 Average (percentage, 0-100)
   - Grade 12 Average (percentage, 0-100)
   - Examen d'état Percentage (0-100)
   - Graduation Year (dropdown: 2024, 2025, 2026)
2. THE AMS SHALL validate that all grade fields are between 0 and 100
3. THE AMS SHALL validate that graduation year is >= 2024
4. THE AMS SHALL calculate applicant age from date_naissance
5. THE AMS SHALL display field labels in French
6. THE AMS SHALL provide helpful tooltips explaining each field
7. THE AMS SHALL save grade data to the applications table

#### Requirement 2.3: Scholarship Application Interface

**User Story:** As an eligible applicant, I want to submit a video URL for the scholarship, so that I can be considered for the Bourse d'Excellence.

**Acceptance Criteria:**

1. WHEN `is_scholarship_eligible` is TRUE, THE AMS SHALL display a "Postuler pour la Bourse d'Excellence" section in the dashboard
2. THE AMS SHALL display scholarship benefits: "Frais de scolarité gratuits + 50 USD/mois"
3. THE AMS SHALL display scholarship requirements: "Maintenir 70% de moyenne annuelle et ne jamais échouer une matière"
4. THE AMS SHALL provide a text input field for pasting a video URL
5. THE AMS SHALL accept video URLs from YouTube (including unlisted videos) and Vimeo
6. THE AMS SHALL validate URL format using regex pattern for YouTube and Vimeo URLs
7. THE AMS SHALL display validation error if URL format is invalid: "Veuillez fournir un lien YouTube ou Vimeo valide"
8. THE AMS SHALL provide instructions: "Téléchargez votre vidéo de présentation (2 minutes) sur YouTube (non répertorié) ou Vimeo et collez le lien ici"
9. WHEN a valid video URL is submitted, THE AMS SHALL store it in the `scholarship_video_url` field
10. THE AMS SHALL update `scholarship_status` to 'video_submitted'
11. THE AMS SHALL display the submitted URL as a clickable link for applicant verification
12. THE AMS SHALL allow URL replacement before admin review
13. THE AMS SHALL NOT upload video files to Supabase Storage
14. THE AMS SHALL NOT validate video duration (applicant responsibility)


#### Requirement 2.4: Scholarship Admin Dashboard

**User Story:** As an admissions officer, I want to view and manage scholarship applications, so that I can select scholarship recipients.

**Acceptance Criteria:**

1. THE AMS SHALL add a "Bourses d'Excellence" tab to the admin dashboard
2. THE AMS SHALL display a table of scholarship-eligible applicants with columns:
   - Applicant_ID
   - Prénom, Nom
   - Grade Averages (10, 11, 12, Exetat)
   - Age
   - Graduation Year
   - Scholarship Status
   - Video URL Submitted (Yes/No)
3. THE AMS SHALL allow filtering by scholarship_status: 'pending', 'video_submitted', 'test_invited', 'interview_invited', 'awarded', 'rejected'
4. THE AMS SHALL allow sorting by grade averages
5. WHEN an admin clicks on an applicant, THE AMS SHALL display full application details + embedded video player
6. THE AMS SHALL embed the video URL using iframe (YouTube/Vimeo embed)
7. THE AMS SHALL display the raw video URL as a clickable link for admins
8. THE AMS SHALL allow admins to update scholarship_status
9. THE AMS SHALL display a counter showing "X/20 scholarships awarded this year"
10. THE AMS SHALL prevent awarding more than 20 scholarships per intake year
11. WHEN scholarship_status changes to 'awarded', THE AMS SHALL update payment_status to 'waived'

#### Requirement 2.5: Scholarship Status Notifications

**User Story:** As an applicant, I want to receive email notifications about my scholarship application status, so that I stay informed of the selection process.

**Acceptance Criteria:**

1. WHEN scholarship_status changes to 'test_invited', THE AMS SHALL send an email with test invitation details
2. WHEN scholarship_status changes to 'interview_invited', THE AMS SHALL send an email with interview scheduling information
3. WHEN scholarship_status changes to 'awarded', THE AMS SHALL send a congratulatory email with scholarship terms
4. WHEN scholarship_status changes to 'rejected', THE AMS SHALL send a polite rejection email
5. THE AMS SHALL compose all scholarship emails in formal academic French
6. THE AMS SHALL include applicant_id in all scholarship emails
7. THE AMS SHALL log all scholarship email sends in the email_logs table


### Category 3: Supabase Backend Setup

#### Requirement 3.1: Database Schema Migration

**User Story:** As a developer, I want a complete Supabase database schema, so that the frontend can interact with a fully functional backend.

**Acceptance Criteria:**

1. THE AMS SHALL create all tables from the existing migration files:
   - applicants
   - applications
   - applicant_id_sequences
   - admissions_officers
   - audit_trail
   - uploaded_documents
   - email_logs
   - webhook_logs
2. THE AMS SHALL create all custom types (enums) for status fields
3. THE AMS SHALL create all database functions (generate_applicant_id, update_application_status_with_version_check)
4. THE AMS SHALL create all triggers (updated_at timestamp triggers)
5. THE AMS SHALL create all indexes for performance optimization
6. THE AMS SHALL verify all constraints (CHECK, UNIQUE, FOREIGN KEY, NOT NULL)
7. THE AMS SHALL seed initial data (intake year 2026, test admin account)

#### Requirement 3.2: Row Level Security (RLS) Policies

**User Story:** As a security engineer, I want comprehensive RLS policies, so that users can only access their own data.

**Acceptance Criteria:**

1. THE AMS SHALL enable RLS on all tables
2. THE AMS SHALL create policies for applicants to read/update their own records
3. THE AMS SHALL create policies for admissions officers to read all records
4. THE AMS SHALL create policies for admissions officers to update application statuses
5. THE AMS SHALL create policies preventing applicants from accessing other applicants' data
6. THE AMS SHALL create policies for document upload (only after payment confirmed)
7. THE AMS SHALL create policies for scholarship video upload (only if eligible)
8. THE AMS SHALL test all RLS policies with different user roles
9. THE AMS SHALL document all RLS policies in migration files


#### Requirement 3.3: Supabase Storage Buckets

**User Story:** As a developer, I want properly configured storage buckets, so that files are stored securely and efficiently.

**Acceptance Criteria:**

1. THE AMS SHALL create storage bucket 'pieces_justificatives' for applicant documents
   - Max file size: 5MB
   - Allowed types: .pdf, .jpg, .jpeg, .png
   - Private bucket with RLS policies
2. THE AMS SHALL create storage bucket 'official_letters' for generated PDFs
   - Max file size: 10MB
   - Allowed types: .pdf
   - Private bucket with RLS policies
3. THE AMS SHALL NOT create a storage bucket for scholarship videos (videos hosted externally)
4. THE AMS SHALL configure RLS policies for each bucket:
   - Applicants can upload to their own folders
   - Applicants can read their own files
   - Admissions officers can read all files
5. THE AMS SHALL organize files in folder structure: [bucket]/[intake_year]/[applicant_id]/[filename]
6. THE AMS SHALL test file upload/download for each bucket

#### Requirement 3.4: Supabase Edge Functions

**User Story:** As a developer, I want Edge Functions for server-side operations, so that sensitive logic runs securely on the backend.

**Acceptance Criteria:**

1. THE AMS SHALL create Edge Function 'payment-webhook' for Pawa Pay callbacks
   - Verify webhook signature
   - Update payment status
   - Send confirmation email
   - Handle idempotency
2. THE AMS SHALL create Edge Function 'admin-decision' for admission decisions
   - Generate PDF letter
   - Upload PDF to storage
   - Send email with PDF attachment
   - Update application status
   - Create audit record
   - Atomic operation with rollback on failure
3. THE AMS SHALL create Edge Function 'generate-applicant-id' for ID generation
   - Atomic sequence increment
   - Row-level locking
   - Format validation
4. THE AMS SHALL create Edge Function 'scholarship-eligibility' for eligibility calculation
   - Validate grade averages
   - Calculate age from date_naissance
   - Check graduation year
   - Update is_scholarship_eligible flag
5. THE AMS SHALL NOT create Edge Functions for Moodle LMS integration
6. THE AMS SHALL NOT create Edge Functions for automated student provisioning
7. THE AMS SHALL deploy all Edge Functions to Supabase
8. THE AMS SHALL test all Edge Functions with unit tests
9. THE AMS SHALL configure environment variables for all Edge Functions


### Category 4: Testing and Quality Assurance

#### Requirement 4.1: Unit Test Coverage

**User Story:** As a developer, I want comprehensive unit tests, so that individual components work correctly.

**Acceptance Criteria:**

1. THE AMS SHALL achieve 90%+ code coverage for all utility functions
2. THE AMS SHALL test all validation functions (email, phone, file upload, grades)
3. THE AMS SHALL test payment provider abstraction layer
4. THE AMS SHALL test Pawa Pay integration (with mocks)
5. THE AMS SHALL test scholarship eligibility calculation
6. THE AMS SHALL test applicant ID generation and formatting
7. THE AMS SHALL test status transition logic
8. THE AMS SHALL test email template rendering
9. THE AMS SHALL test PDF generation
10. THE AMS SHALL run all unit tests in CI/CD pipeline

#### Requirement 4.2: Property-Based Testing

**User Story:** As a developer, I want property-based tests for correctness properties, so that the system maintains invariants across all inputs.

**Acceptance Criteria:**

1. THE AMS SHALL implement all 45 existing correctness properties from the original design
2. THE AMS SHALL add new properties for scholarship eligibility:
   - Property: FOR ALL applicants with grades >= 70%, age < 20, graduation >= 2024, is_scholarship_eligible SHALL be TRUE
   - Property: FOR ALL applicants not meeting criteria, is_scholarship_eligible SHALL be FALSE
3. THE AMS SHALL add new properties for payment provider abstraction:
   - Property: FOR ALL payment providers, initiatePayment() SHALL return consistent response format
   - Property: FOR ALL webhook signatures, verifyWebhook() SHALL accept valid signatures and reject invalid ones
4. THE AMS SHALL run property-based tests with minimum 100 iterations
5. THE AMS SHALL use fast-check library for property-based testing
6. THE AMS SHALL tag all property tests with feature name and property number


#### Requirement 4.3: Integration Testing

**User Story:** As a developer, I want integration tests for critical workflows, so that components work together correctly.

**Acceptance Criteria:**

1. THE AMS SHALL test complete applicant registration flow (profile → academic history → payment → documents)
2. THE AMS SHALL test payment webhook processing end-to-end
3. THE AMS SHALL test admin decision workflow (PDF generation → email → status update → audit)
4. THE AMS SHALL test scholarship eligibility detection and video URL submission and validation
5. THE AMS SHALL test concurrent edit detection with optimistic locking
6. THE AMS SHALL test email retry logic with exponential backoff
7. THE AMS SHALL test file upload with size/type validation
8. THE AMS SHALL test RLS policies with different user roles
9. THE AMS SHALL use test database for integration tests
10. THE AMS SHALL clean up test data after each integration test

#### Requirement 4.4: End-to-End (E2E) Testing

**User Story:** As a QA engineer, I want E2E tests for complete user journeys, so that the entire system works from the user's perspective.

**Acceptance Criteria:**

1. THE AMS SHALL test complete applicant journey:
   - Landing page → Registration → Academic history → Payment → Document upload → Dashboard
2. THE AMS SHALL test scholarship-eligible applicant journey:
   - Registration with high grades → Scholarship interface appears → Video URL submission → Status tracking
3. THE AMS SHALL test admin journey:
   - Login → View applications → Review documents → Make decision → Verify email sent
4. THE AMS SHALL test scholarship admin journey:
   - View scholarship applicants → Watch videos → Award scholarships → Verify payment waived
5. THE AMS SHALL test error scenarios:
   - Invalid payment → Retry flow
   - File upload errors → Error messages
   - Concurrent edits → Warning display
6. THE AMS SHALL use Playwright for E2E tests
7. THE AMS SHALL run E2E tests on Chrome, Firefox, and Safari
8. THE AMS SHALL test responsive design on mobile and desktop viewports
9. THE AMS SHALL capture screenshots on test failures
10. THE AMS SHALL run E2E tests in CI/CD pipeline


#### Requirement 4.5: Edge Case Handling

**User Story:** As a developer, I want comprehensive edge case handling, so that the system behaves correctly in unusual scenarios.

**Acceptance Criteria:**

1. THE AMS SHALL handle edge case: Applicant submits form with whitespace-only fields
   - Validation error: "Ce champ est requis"
2. THE AMS SHALL handle edge case: Applicant uploads file with incorrect extension but valid MIME type
   - Reject upload with error message
3. THE AMS SHALL handle edge case: Payment webhook received multiple times for same transaction
   - Process only once (idempotency)
4. THE AMS SHALL handle edge case: Admin makes decision while another admin is viewing same application
   - Display concurrent edit warning
5. THE AMS SHALL handle edge case: Applicant turns 20 years old between registration and scholarship application
   - Recalculate eligibility, revoke scholarship access if no longer eligible
6. THE AMS SHALL handle edge case: Applicant submits invalid video URL format
   - Display validation error: "Veuillez fournir un lien YouTube ou Vimeo valide"
7. THE AMS SHALL handle edge case: Applicant submits video URL that returns 404 or is private
   - Accept URL (admin will verify during review)
8. THE AMS SHALL handle edge case: Email service unavailable during decision notification
   - Retry up to 3 times, log failure, allow manual retry
9. THE AMS SHALL handle edge case: PDF generation fails due to missing environment variables
   - Rollback status change, display admin error message
10. THE AMS SHALL handle edge case: Applicant tries to apply for scholarship when 20 already awarded
    - Display message: "Toutes les bourses ont été attribuées pour cette année"
11. THE AMS SHALL handle edge case: Intake year changes (Sept 1st) during active session
    - Use intake year from application creation, not current date


### Category 5: Production Readiness

#### Requirement 5.1: Environment Configuration

**User Story:** As a DevOps engineer, I want proper environment configuration, so that the system can be deployed to production.

**Acceptance Criteria:**

1. THE AMS SHALL use environment variables for all configuration:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - PAYMENT_PROVIDER (pawapay, mock)
   - PAWAPAY_API_KEY
   - PAWAPAY_API_SECRET
   - PAWAPAY_WEBHOOK_SECRET
   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
   - FROM_EMAIL
   - PDF_LOGO_URL, PDF_SIGNATURE_URL, PDF_FOOTER_TEXT
   - NEXT_PUBLIC_APP_URL (admissions.ignitoacademy.com)
   - CURRENT_INTAKE_YEAR
   - APPLICATION_FEE_USD
   - MAX_SCHOLARSHIPS_PER_YEAR
2. THE AMS SHALL provide .env.example with all required variables
3. THE AMS SHALL validate required environment variables on startup
4. THE AMS SHALL use different .env files for development, staging, production
5. THE AMS SHALL never commit .env files to version control
6. THE AMS SHALL document all environment variables in README.md

#### Requirement 5.2: Error Handling and Logging

**User Story:** As a system operator, I want comprehensive error handling and logging, so that I can diagnose and fix issues quickly.

**Acceptance Criteria:**

1. THE AMS SHALL log all errors with structured data (timestamp, level, error_code, message, context)
2. THE AMS SHALL use different log levels: error, warn, info, debug
3. THE AMS SHALL log all payment API requests and responses
4. THE AMS SHALL log all webhook receipts
5. THE AMS SHALL log all email send attempts and results
6. THE AMS SHALL log all file uploads with size and type
7. THE AMS SHALL log all admin actions (status changes, decisions)
8. THE AMS SHALL display user-friendly error messages in French
9. THE AMS SHALL display technical error details only to admins
10. THE AMS SHALL integrate with error tracking service (Sentry or similar)
11. THE AMS SHALL send alerts for critical errors (payment failures, email failures, database errors)


#### Requirement 5.3: Performance Optimization

**User Story:** As a user, I want fast page loads and responsive interactions, so that I have a smooth experience.

**Acceptance Criteria:**

1. THE AMS SHALL load landing page in < 2 seconds on 3G connection
2. THE AMS SHALL load dashboard in < 1 second on 4G connection
3. THE AMS SHALL process payment webhooks in < 500ms
4. THE AMS SHALL generate PDFs in < 3 seconds
5. THE AMS SHALL upload videos with progress indicator
6. THE AMS SHALL implement code splitting for route-based lazy loading
7. THE AMS SHALL optimize images with Next.js Image component
8. THE AMS SHALL use database indexes for frequently queried columns
9. THE AMS SHALL implement connection pooling for database queries
10. THE AMS SHALL cache static assets with 1-year expiry
11. THE AMS SHALL use CDN for file delivery (Supabase Storage CDN)
12. THE AMS SHALL implement pagination for admin application table (50 per page)

#### Requirement 5.4: Security Hardening

**User Story:** As a security engineer, I want comprehensive security measures, so that user data is protected.

**Acceptance Criteria:**

1. THE AMS SHALL use Supabase Auth for ALL user authentication and password management
2. THE AMS SHALL NOT implement manual password hashing (bcrypt or otherwise)
3. THE AMS SHALL rely on Supabase Auth's native password encryption and security
4. THE AMS SHALL use Supabase Auth for JWT token generation and session management
5. THE AMS SHALL transmit all data over HTTPS (TLS 1.2+)
6. THE AMS SHALL implement CSRF protection on all state-changing operations
7. THE AMS SHALL validate and sanitize all user inputs
8. THE AMS SHALL implement rate limiting:
   - Authentication endpoints: 5 attempts per 15 minutes (via Supabase Auth)
   - Payment initiation: 3 attempts per hour per applicant
   - File upload: 10 uploads per hour per applicant
9. THE AMS SHALL verify webhook signatures for all payment callbacks
10. THE AMS SHALL use RLS policies for all database access
11. THE AMS SHALL implement Content Security Policy (CSP) headers
12. THE AMS SHALL implement secure session management via Supabase Auth (httpOnly, secure, sameSite cookies)
13. THE AMS SHALL conduct security audit before production deployment
14. THE AMS SHALL implement automated security scanning in CI/CD


#### Requirement 5.5: Monitoring and Observability

**User Story:** As a system operator, I want monitoring and observability tools, so that I can track system health and performance.

**Acceptance Criteria:**

1. THE AMS SHALL track key metrics:
   - Application submission rate (per day/week)
   - Payment success rate by provider
   - Payment failure rate by provider
   - Scholarship eligibility rate
   - Video URL submission success rate
   - Email delivery success rate
   - Average response time for API endpoints
   - Database query performance
2. THE AMS SHALL integrate with monitoring service (Vercel Analytics, Datadog, or similar)
3. THE AMS SHALL create dashboards for:
   - Application funnel (registrations → payments → admissions)
   - Scholarship funnel (eligible → video submitted → awarded)
   - System health (uptime, errors, performance)
4. THE AMS SHALL set up alerts for:
   - Payment webhook failures (> 5% failure rate)
   - Email delivery failures (> 10% failure rate)
   - API response time > 2 seconds (95th percentile)
   - Database connection errors
   - Storage quota approaching limit
5. THE AMS SHALL implement health check endpoint (/api/health)
6. THE AMS SHALL log all metrics to structured logging service

#### Requirement 5.6: Deployment Configuration

**User Story:** As a DevOps engineer, I want automated deployment configuration, so that deployments are consistent and reliable.

**Acceptance Criteria:**

1. THE AMS SHALL deploy frontend to Vercel
2. THE AMS SHALL configure custom domain: admissions.ignitoacademy.com
3. THE AMS SHALL configure SSL certificate for custom domain
4. THE AMS SHALL deploy Supabase backend (database, storage, Edge Functions)
5. THE AMS SHALL configure Supabase region: Europe (closest to DRC)
6. THE AMS SHALL implement CI/CD pipeline:
   - Run tests on every pull request
   - Deploy to staging on merge to develop branch
   - Deploy to production on merge to main branch
7. THE AMS SHALL implement database migration strategy:
   - Run migrations automatically on deployment
   - Rollback capability for failed migrations
8. THE AMS SHALL implement backup strategy:
   - Automated daily database backups
   - 30-day backup retention
   - Point-in-time recovery enabled
9. THE AMS SHALL document deployment process in DEPLOYMENT.md
10. THE AMS SHALL create runbook for common operational tasks


### Category 6: Documentation and Maintenance

#### Requirement 6.1: OTHM Negative Constraint (CRITICAL)

**User Story:** As a product manager, I want to ensure the "OTHM" keyword never appears in the system, so that we maintain white-labeling and IP protection.

**Acceptance Criteria:**

1. THE AMS SHALL NOT include the keyword "OTHM" anywhere in the codebase
2. THE AMS SHALL NOT include the keyword "OTHM" in any frontend UI text, labels, or placeholders
3. THE AMS SHALL NOT include the keyword "OTHM" in the landing page content
4. THE AMS SHALL NOT include the keyword "OTHM" in the database schema (table names, column names, comments)
5. THE AMS SHALL NOT include the keyword "OTHM" in environment variables or configuration files
6. THE AMS SHALL NOT include the keyword "OTHM" in email templates or PDF documents
7. THE AMS SHALL NOT include the keyword "OTHM" in API endpoint names or responses
8. THE AMS SHALL implement automated linting/scanning to detect and prevent "OTHM" keyword usage
9. THE AMS SHALL use "UK Level 3 Foundation Diploma" as the qualification reference
10. THE AMS SHALL document this negative constraint in the codebase README and developer guidelines

#### Requirement 6.2: Technical Documentation

**User Story:** As a developer, I want comprehensive technical documentation, so that I can understand and maintain the system.

**Acceptance Criteria:**

1. THE AMS SHALL provide README.md with:
   - Project overview
   - Tech stack
   - Setup instructions
   - Environment variables
   - Running tests
   - Deployment process
   - OTHM negative constraint warning
2. THE AMS SHALL provide API documentation for all endpoints
3. THE AMS SHALL provide database schema documentation
4. THE AMS SHALL provide payment provider integration guide
5. THE AMS SHALL provide scholarship system documentation
6. THE AMS SHALL document all Edge Functions
7. THE AMS SHALL document all RLS policies
8. THE AMS SHALL provide code comments for complex logic
9. THE AMS SHALL maintain CHANGELOG.md for version history
10. THE AMS SHALL provide troubleshooting guide for common issues

#### Requirement 6.3: User Documentation

**User Story:** As an admissions officer, I want user documentation, so that I can use the admin dashboard effectively.

**Acceptance Criteria:**

1. THE AMS SHALL provide admin user guide with:
   - Login instructions
   - Application review process
   - Making admission decisions
   - Managing scholarship applications
   - Viewing audit trail
   - Processing refunds
2. THE AMS SHALL provide applicant user guide with:
   - Registration process
   - Payment instructions
   - Document upload guide
   - Scholarship application guide
   - Status tracking
3. THE AMS SHALL provide FAQ document
4. THE AMS SHALL provide video tutorials for key workflows
5. THE AMS SHALL provide user documentation in French


## Correctness Properties for Property-Based Testing

### Existing Properties (45 from original design)
All 45 properties from the original PRD remain valid and SHALL be implemented.

### New Properties for Migration and Enhancement

#### Property 46: Payment Provider Abstraction
FOR ALL payment providers implementing the PaymentProvider interface, calling initiatePayment() with valid parameters SHALL return a response with fields: transactionId, status, and paymentUrl (or null).

#### Property 47: Payment Provider Consistency
FOR ALL payment providers, the payment status values returned SHALL be one of: 'Pending', 'Confirmed', 'Failed', 'Refunded'.

#### Property 48: Scholarship Eligibility Calculation
FOR ALL applicants with grade_10_average >= 70 AND grade_11_average >= 70 AND grade_12_average >= 70 AND exetat_percentage >= 70 AND graduation_year >= 2024 AND age < 20, is_scholarship_eligible SHALL be TRUE.

#### Property 49: Scholarship Eligibility Exclusion
FOR ALL applicants where ANY of (grade_10_average < 70 OR grade_11_average < 70 OR grade_12_average < 70 OR exetat_percentage < 70 OR graduation_year < 2024 OR age >= 20), is_scholarship_eligible SHALL be FALSE.

#### Property 50: Scholarship Award Limit
FOR ALL intake years, the count of applications with scholarship_status = 'awarded' SHALL be <= 20.

#### Property 51: Payment Waiver on Scholarship Award
FOR ALL applications where scholarship_status = 'awarded', payment_status SHALL be 'waived'.

#### Property 52: Video URL Submission Eligibility
FOR ALL applications, IF scholarship_video_url IS NOT NULL, THEN is_scholarship_eligible SHALL be TRUE.

#### Property 53: Grade Range Validation
FOR ALL applications, grade_10_average, grade_11_average, grade_12_average, and exetat_percentage SHALL be NULL OR between 0 and 100 (inclusive).

#### Property 54: Graduation Year Validation
FOR ALL applications, graduation_year SHALL be NULL OR >= 2024.

#### Property 55: Webhook Signature Verification
FOR ALL webhook requests with valid signatures, verifyWebhook() SHALL return TRUE. FOR ALL webhook requests with invalid signatures, verifyWebhook() SHALL return FALSE.

#### Property 56: Refund Transaction Recording
FOR ALL refund operations, exactly one record SHALL be created in the refund_transactions table with admin_id, applicant_id, amount, reason, and timestamp.

#### Property 57: Video URL Format Validation
FOR ALL submitted scholarship video URLs, the URL SHALL match the regex pattern for YouTube or Vimeo URLs.

#### Property 58: Video URL Storage
FOR ALL applications with scholarship_video_url NOT NULL, the URL SHALL be a valid string starting with 'http://' or 'https://'.

#### Property 59: Scholarship Status Transition Validity
FOR ALL scholarship_status transitions, the transition SHALL be one of the allowed transitions: pending → video_submitted → test_invited → interview_invited → (awarded OR rejected).

#### Property 60: Age Calculation Consistency
FOR ALL applicants, calculating age from date_naissance on the same date SHALL always produce the same age value (deterministic property).

#### Property 61: OTHM Keyword Prohibition
FOR ALL text content in the system (codebase, UI, database, emails, PDFs), the keyword "OTHM" SHALL NOT appear.


## Non-Functional Requirements

### Performance
1. Landing page load time: < 2 seconds on 3G
2. Dashboard load time: < 1 second on 4G
3. Payment webhook processing: < 500ms
4. PDF generation: < 3 seconds
5. Database query response: < 100ms (95th percentile)
6. API endpoint response: < 500ms (95th percentile)
7. Support 100+ concurrent users without degradation

### Security
1. Authentication: Supabase Auth native password management and JWT tokens
2. Data transmission: HTTPS with TLS 1.2+
3. CSRF protection on all state-changing operations
4. Input validation and sanitization
5. Rate limiting on sensitive endpoints (via Supabase Auth and custom logic)
6. Webhook signature verification
7. RLS policies on all database tables
8. Content Security Policy headers
9. Secure session management via Supabase Auth
10. Regular security audits

### Availability
1. Uptime: 99.5% during application periods
2. Database backups: Every 6 hours
3. Backup retention: 30 days
4. Point-in-time recovery: 24-hour window
5. Disaster recovery plan documented
6. Automated failover for critical services

### Scalability
1. Support 10,000+ applications per intake year
2. Support 1,000+ scholarship applications per year
3. Database partitioning by intake_year if needed
4. CDN for static assets and file delivery
5. Horizontal scaling for Edge Functions

### Compliance
1. UK Level 3 Foundation Diploma qualification pathway support
2. Audit trail retention: 7+ years
3. Data privacy compliance (GDPR-like principles)
4. Formal academic French in all communications
5. Accessibility standards (WCAG 2.1 Level AA)
6. OTHM keyword prohibition (white-labeling and IP protection)
7. No automated Moodle LMS integration (manual handshake only)

### Maintainability
1. Code coverage: 90%+ for critical paths
2. Comprehensive documentation
3. Automated testing in CI/CD
4. Structured logging for debugging
5. Monitoring and alerting
6. Clear error messages
7. Modular architecture for easy updates
8. Payment provider abstraction for flexibility


## Success Criteria

The project will be considered successful when:

1. **Payment System**
   - Pawa Pay integration is fully functional
   - Payment provider can be switched via environment variable
   - Mock payment mode works for development
   - Refund functionality is operational
   - Payment success rate > 95%

2. **Scholarship System**
   - Eligibility detection is automatic and accurate (grades/age/graduation only, no English proficiency)
   - Scholarship interface appears only for eligible applicants
   - Video URL submission works reliably (YouTube/Vimeo)
   - Admin can review videos via embedded player
   - Admin can award scholarships
   - Maximum 20 scholarships enforced per year
   - Payment waived for scholarship recipients
   - No video file uploads to Supabase Storage

3. **Supabase Backend**
   - All database tables created and functional
   - All RLS policies implemented and tested
   - 2 storage buckets configured (documents, letters - no video bucket)
   - All Edge Functions deployed and working (no Moodle integration)
   - Database migrations run successfully
   - Supabase Auth handles all authentication

4. **Testing**
   - 90%+ code coverage
   - All 61 correctness properties pass (including OTHM prohibition)
   - All integration tests pass
   - All E2E tests pass on Chrome, Firefox, Safari
   - All edge cases handled gracefully
   - Video URL validation tested

5. **Production Deployment**
   - Deployed to admissions.ignitoacademy.com
   - SSL certificate configured
   - Environment variables set correctly
   - Monitoring and alerting active
   - Backup strategy implemented
   - Documentation complete

6. **User Experience**
   - Landing page loads in < 2 seconds
   - Dashboard loads in < 1 second
   - All forms work on mobile devices
   - Error messages are clear and in French
   - Email notifications delivered reliably
   - PDF letters generated correctly

7. **Security**
   - All RLS policies tested
   - Webhook signatures verified
   - Rate limiting active
   - Security audit passed
   - No critical vulnerabilities
   - Supabase Auth handles all authentication
   - No "OTHM" keyword in system

8. **Compliance**
   - UK Level 3 Foundation Diploma pathway supported
   - No automated Moodle integration
   - OTHM keyword prohibited throughout system
   - Manual LMS enrollment process documented

---

**Document Version:** 2.1 (FINAL - APPROVED)  
**Created:** 2026-04-09  
**Last Updated:** 2026-04-09  
**Status:** ✅ APPROVED - Ready for Technical Design Document  
**Next Steps:** Generate design.md with complete technical architecture

**Changelog:**
- v2.1 (FINAL): Surgical cleanup of residual video upload references
  - Updated Requirement 4.3: "video upload" → "video URL submission and validation"
  - Updated Requirement 4.4: "Video upload" → "Video URL submission"
  - Updated Requirement 5.5: "Video upload success rate" → "Video URL submission success rate"
  - Removed Performance NFR Item 5: "Video upload: Progress indicator, resumable uploads"
  - Removed Scalability NFR Item 3: "Support 100+ concurrent video uploads"
- v2.0: Integrated 5 non-negotiable architectural constraints from Product Manager
  - Added OTHM negative constraint (Requirement 6.1, Property 61)
  - Clarified scholarship eligibility (no English proficiency filter)
  - Removed Moodle LMS integration scope
  - Updated authentication to Supabase Auth only (no manual bcrypt)
  - Changed video uploads to URL submission (YouTube/Vimeo)
- v1.0: Initial requirements document

**Product Manager Approval:** ✅ GRANTED  
**Date:** 2026-04-09

