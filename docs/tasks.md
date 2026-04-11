# Implementation Plan: Ignito Academy Admission Management System

## Overview

This document outlines the implementation tasks for the Ignito Academy AMS, a full-stack admission management system built with Next.js 14+, TypeScript, Tailwind CSS, and Supabase. The system manages the complete admission lifecycle for prospective students in the Democratic Republic of Congo, including bilingual landing page, application submission, Mobile Money payment processing, document management, and administrative review workflows.

**Technology Stack:**
- Frontend: Next.js 14+ (App Router), React 18+, TypeScript, Tailwind CSS
- Backend: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- Payment: Nomba DRC API (M-Pesa, Orange Money, Airtel Money)
- PDF Generation: @react-pdf/renderer
- Testing: Vitest, fast-check (property-based testing), Playwright (E2E)
- Fonts: Larken (serif, headings), Inter (sans-serif, body)
- Design System: Primary Navy #021463, Accent Blue #4EA6F5

**Key Implementation Notes:**
- All French content must use formal academic style
- Applicant_ID format: IGN-[YEAR]-[SEQUENCE] (e.g., IGN-2026-00001)
- Phone format: +243 followed by 9 digits (13 characters total)
- Application fee: 29 USD (non-refundable)
- File uploads: Max 5MB, .pdf/.jpg/.jpeg/.png only
- Mobile-first responsive design (320px+ screens, 48px touch targets)
- All database operations protected by Row Level Security (RLS)
- Critical workflows (PDF + Email + Status Update) must be atomic

## Tasks

### Epic 1: Project Initialization & Infrastructure Setup

- [x] 1. Initialize Next.js project with TypeScript and Tailwind CSS
  - Create Next.js 14+ project with App Router enabled
  - Configure TypeScript with strict mode
  - Set up Tailwind CSS with custom color palette (Primary Navy #021463, Accent Blue #4EA6F5)
  - Configure custom fonts: Larken (serif) for headings, Inter (sans-serif) for body text
  - Create `.env.local` file with environment variable placeholders
  - _Requirements: 16.1-16.9_

- [x] 2. Configure Supabase client and authentication
  - Install `@supabase/supabase-js` and `@supabase/auth-helpers-nextjs`
  - Create `lib/supabase/client.ts` for browser client
  - Create `lib/supabase/server.ts` for server-side client
  - Configure Supabase URL and anon key from environment variables
  - Set up authentication middleware for protected routes
  - _Requirements: 1.1, 7.1, 17.3_

- [x] 3. Execute database migrations and create schema
  - Create SQL migration file `supabase/migrations/001_initial_schema.sql`
  - Define custom ENUM types: `application_status_enum`, `payment_status_enum`, `exam_status_enum`, `email_status_enum`
  - Create tables: `applicants`, `applications`, `applicant_id_sequences`, `admissions_officers`, `audit_trail`, `uploaded_documents`, `email_logs`, `webhook_logs`
  - Add CHECK constraints for phone format (+243[9 digits]), email format, Applicant_ID format (IGN-[YEAR]-[SEQUENCE])
  - Create indexes on foreign keys and frequently queried columns
  - Execute migration: `supabase db push`
  - _Requirements: 1.6, 18.1-18.4, 23.1-23.2, 30.1-30.8_

- [x] 4. Initialize Local Supabase Development Environment
  - Run `supabase init` to create the local configuration
  - Start the local instance using `supabase start`
  - Ensure local Edge Functions can be served and tested via `supabase functions serve` before proceeding to API integration
  - Verify local database is accessible and migrations applied

- [x] 5. Create database functions and triggers
  - Implement `generate_applicant_id(p_intake_year INTEGER)` function with row-level locking for atomic sequence increment
  - Implement `update_application_status_with_version_check()` function for optimistic locking
  - Create `update_updated_at_timestamp()` trigger function
  - Attach triggers to `applicants`, `applications`, `admissions_officers` tables
  - Create immutability rules for `audit_trail` table (prevent UPDATE/DELETE)
  - _Requirements: 1.2, 11.2-11.4, 18.4_

- [x] 6. Configure Row Level Security (RLS) policies
  - Enable RLS on all tables
  - Create applicant policies: select/update own records, public insert for registration
  - Create application policies: applicants can read/update own (before payment), officers can read/update all
  - Create document policies: applicants can upload after payment, officers can read all
  - Create audit trail policies: officers can read/insert only, no updates/deletes
  - Create storage bucket policies for `pieces_justificatives` and `official_letters`
  - _Requirements: 6.1-6.2, 9.1, 17.5, 20.6_

- [x] 7. Create Supabase Storage buckets
  - Create `pieces_justificatives` bucket (private, 5MB limit, .pdf/.jpg/.jpeg/.png only)
  - Create `official_letters` bucket (private, 10MB limit, .pdf only)
  - Configure folder structure: `[intake_year]/[applicant_id]/[filename]`
  - Set up RLS policies for bucket access control
  - _Requirements: 6.5, 20.4_


### Epic 2: Landing Page (Conversion Engine)

- [x] 8. Build bilingual landing page with language toggle
  - Create `app/page.tsx` as the landing page component
  - Implement language context provider with French/English toggle
  - Set French as default language
  - Create translation JSON files: `locales/fr.json` and `locales/en.json`
  - Implement language switcher component in header
  - Store language preference in localStorage
  - _Requirements: 15.1-15.5_

- [x] 9. Implement hero section with academic branding
  - Create hero component with headline and subheadline in both languages
  - Use Larken font for h1 heading
  - Apply Primary Navy (#021463) for text, Accent Blue (#4EA6F5) for accents
  - Add Ignito Academy logo
  - Ensure mobile-first responsive design (320px+)
  - _Requirements: 15.6-15.7, 16.1-16.9_

- [x] 10. Build 4-year pathway timeline visualization
  - Create timeline component showing: Year 1-2 (Foundation), Year 3 (Diploma), Year 4 (Degree)
  - Display NCC Education partnership badge
  - Use visual indicators (icons, progress bars) for each stage
  - Ensure responsive layout for mobile and desktop
  - _Requirements: 15.5_

- [x] 11. Add primary CTA button routing to application portal
  - Create CTA button with text "Déposer un dossier d'admission" (FR) / "Apply for Admission" (EN)
  - Route to `/apply` on click
  - Style with Accent Blue background, white text, 48px minimum touch target
  - Add hover and focus states for accessibility
  - _Requirements: 15.6-15.7, 16.8_


### Epic 3: Applicant Authentication & Profile Creation (Step 1)

- [x] 12. Implement Supabase Auth registration flow
  - Create `app/apply/page.tsx` with multi-step form
  - Implement Step 1: Profile creation form
  - Use Zod schema for client-side validation
  - Integrate Supabase Auth `signUp()` method
  - Handle duplicate email/phone errors with French error messages
  - Display "Se connecter" prompt for existing users
  - _Requirements: 1.1, 1.4-1.5, 29.1-29.2_

- [x] 13. Build profile creation form with validation
  - Create form fields: Prénom, Nom, Date de Naissance, Téléphone, Email, Password
  - Implement phone number validation: +243 format, exactly 13 characters
  - Validate email format using Zod
  - Validate date of birth (must be in the past)
  - Ensure all fields are required (NOT NULL constraint)
  - Display validation errors in French
  - _Requirements: 1.1, 1.6, 23.1-23.4, 30.6_

- [x] 14. Generate and display Applicant_ID
  - Call `generate_applicant_id()` RPC function after successful registration
  - Pass current intake year (2026) as parameter
  - Display generated Applicant_ID to user in format IGN-[YEAR]-[SEQUENCE]
  - Store Applicant_ID in `applications` table linked to user_id
  - Set initial Application_Status to "Dossier Créé" and Payment_Status to "Pending"
  - _Requirements: 1.2-1.3, 1.7, 18.1-18.4_

- [x] 13.1 Write property test for Applicant ID format
  - **Property 1: Applicant ID Format Invariant**
  - **Validates: Requirements 1.2, 18.1, 18.3**
  - Use fast-check to generate random years (2025-2050) and sequences (1-99999)
  - Verify format matches IGN-[4_DIGIT_YEAR]-[5_DIGIT_SEQUENCE]
  - Run 100+ iterations

- [x] 13.2 Write property test for Applicant ID round-trip
  - **Property 2: Applicant ID Round-Trip**
  - **Validates: Requirements 18.5**
  - Generate random Applicant_IDs, parse to extract components, reformat
  - Verify reformatted ID equals original ID
  - Run 100+ iterations

- [x] 13.3 Write property test for Applicant ID uniqueness
  - **Property 3: Applicant ID Uniqueness**
  - **Validates: Requirements 1.2, 30.3**
  - Generate multiple applications in same intake year
  - Verify no duplicate Applicant_IDs exist
  - Run 100+ iterations


### Epic 4: Academic History Form (Step 2)

- [x] 15. Build academic history form
  - Create Step 2 of multi-step form in `app/apply/page.tsx`
  - Add form fields: École de provenance (text), Option (text), Exam Status (radio buttons)
  - Provide exactly two Exam Status options: "En attente des résultats" and "Diplôme obtenu"
  - Use Zod schema for validation (all fields required)
  - Display validation errors in French
  - _Requirements: 2.1-2.2_

- [x] 16. Save academic history to applications table
  - On form submission, update `applications` table with academic fields
  - Update fields: `ecole_provenance`, `option_academique`, `exam_status`
  - Ensure update only allowed when Payment_Status is NOT "Confirmed"
  - Handle errors gracefully with French error messages
  - _Requirements: 2.3-2.4_

- [x] 15.1 Write property test for academic history update window
  - **Property 19: Academic History Update Window**
  - **Validates: Requirements 2.4**
  - Generate applications with various payment statuses
  - Verify updates allowed only when Payment_Status is NOT "Confirmed"
  - Run 100+ iterations

- [x] 15.2 Write property test for Exam Status enum validation
  - **Property 20: Exam Status Enum Validation**
  - **Validates: Requirements 2.2**
  - Attempt to insert applications with various exam_status values
  - Verify only "En attente des résultats" and "Diplôme obtenu" are accepted
  - Run 100+ iterations


### Epic 5: Payment Integration (Nomba DRC) & Webhook

- [x] 17. Build payment initiation UI
  - Create Step 3 of multi-step form: Payment page
  - Display application fee: "29 USD" with "Frais non remboursables" notice
  - Create radio button group for provider selection: M-Pesa, Orange Money, Airtel Money
  - Add "Payer 29 USD" button
  - Display Applicant_ID on payment page
  - _Requirements: 3.1-3.3, 4.1-4.2_

- [x] 18. Integrate Nomba API for payment initiation
  - Create API route: `app/api/payment/initiate/route.ts`
  - Implement POST handler to call Nomba API `/v1/payments/initiate`
  - Send payload: amount (29.00), currency (USD), provider, reference (Applicant_ID), callback_url
  - Set Authorization header with Nomba API key from environment variable
  - Handle timeout (10 seconds) and display French error message
  - Return payment_url and transaction_id to frontend
  - Set Payment_Status to "Pending" in database
  - _Requirements: 4.3-4.4_

- [x] 19. Create payment-webhook Edge Function
  - Create `supabase/functions/payment-webhook/index.ts`
  - Implement webhook signature validation using HMAC-SHA256
  - Extract transaction_id, reference (Applicant_ID), status from payload
  - Check `webhook_logs` table for duplicate transaction_id (idempotency)
  - Insert webhook receipt into `webhook_logs` table
  - _Requirements: 19.1-19.6_

- [x] 20. Implement webhook payment status update logic
  - Update Payment_Status to "Confirmed" or "Failed" based on webhook status
  - If status is "success": Update Application_Status to "Frais Réglés", set payment_confirmed_at timestamp
  - If status is "failed": Keep Application_Status as "Dossier Créé"
  - Store transaction_id in applications table
  - _Requirements: 4.5-4.7_

- [x] 21. Send payment confirmation email via webhook
  - When Payment_Status changes to "Confirmed", trigger email send
  - Use Supabase email service or Resend integration
  - Email subject: "Confirmation de réception de votre dossier d'admission"
  - Email body: Formal academic French, include Applicant_ID
  - Send to applicant's registered email address
  - Log email attempt in `email_logs` table
  - _Requirements: 5.1-5.4_

- [x] 22. Implement frontend polling for payment status
  - Create `app/api/payment/status/[applicantId]/route.ts` GET endpoint
  - Return current Payment_Status and Application_Status
  - In payment page, poll every 5 seconds while Payment_Status is "Pending"
  - Stop polling when status changes to "Confirmed" or "Failed"
  - Display loading indicator during polling
  - Auto-redirect to dashboard on "Confirmed"
  - Display "Réessayer le paiement" button on "Failed"
  - _Requirements: 4.8-4.10, 26.1-26.4_

- [x] 21.1 Write property test for webhook idempotency
  - **Property 37: Webhook Idempotency**
  - **Validates: Requirements 19.5**
  - Send duplicate webhooks with same transaction_id
  - Verify Payment_Status updated exactly once
  - Run 100+ iterations

- [x] 21.2 Write property test for payment confirmation triggers status update
  - **Property 11: Payment Confirmation Triggers Status Update**
  - **Validates: Requirements 4.5, 4.6**
  - Generate applications with Payment_Status transitioning from "Pending" to "Confirmed"
  - Verify Application_Status transitions from "Dossier Créé" to "Frais Réglés"
  - Run 100+ iterations

- [x] 21.3 Write property test for payment confirmation triggers email
  - **Property 12: Payment Confirmation Triggers Email**
  - **Validates: Requirements 5.1, 5.3, 5.4**
  - Generate payment confirmations
  - Verify exactly one email sent to applicant's email with Applicant_ID
  - Run 100+ iterations


### Epic 6: Applicant Dashboard & Document Upload

- [x] 23. Build protected applicant dashboard
  - Create `app/dashboard/page.tsx` with authentication middleware
  - Verify user is authenticated via Supabase Auth
  - Fetch user's applications from database (filter by user_id)
  - Display "Espace Étudiant" header
  - Show logout button
  - _Requirements: 7.1_

- [x] 24. Display application status tracker
  - Create status tracker component showing current Application_Status
  - Display possible statuses: "Dossier Créé", "Frais Réglés", "En Cours d'Évaluation", "Admission sous réserve", "Admission définitive", "Dossier refusé"
  - Use visual indicators (colors, icons) for each status
  - Display Applicant_ID prominently
  - Show Payment_Status if not "Confirmed"
  - _Requirements: 7.2-7.5_

- [x] 25. Implement document upload interface
  - Create file upload component in dashboard
  - Disable upload section while Payment_Status is NOT "Confirmed"
  - Enable upload section when Payment_Status is "Confirmed"
  - Accept file types: .pdf, .jpg, .jpeg, .png
  - Validate file size: maximum 5MB (5,242,880 bytes)
  - Validate MIME type matches file extension
  - _Requirements: 6.1-6.4, 20.1-20.3_

- [x] 26. Upload documents to Supabase Storage
  - Create API route: `app/api/documents/upload/route.ts`
  - Verify Payment_Status is "Confirmed" before allowing upload
  - Generate unique file path: `pieces_justificatives/[intake_year]/[applicant_id]/[filename]`
  - Upload file to Supabase Storage bucket
  - Insert record into `uploaded_documents` table with metadata
  - Display uploaded files list with filename and timestamp
  - _Requirements: 6.5-6.7, 20.4-20.5_

- [x] 27. Implement payment retry functionality
  - Display "Réessayer le paiement" button when Payment_Status is "Failed"
  - Allow retry using same Applicant_ID
  - Re-initiate payment flow with Nomba API
  - _Requirements: 4.8-4.9_

- [x] 28. Add reapplication support
  - Display "Nouvelle Candidature" button for users with completed applications from previous years
  - On click, generate new Applicant_ID for current Intake_Year
  - Link new application to same user_id
  - Preserve historical application data
  - _Requirements: 8.1-8.5_

- [x] 27.1 Write property test for document upload requires payment
  - **Property 13: Document Upload Requires Payment**
  - **Validates: Requirements 6.1, 6.2, 30.3**
  - Generate applications with various payment statuses
  - Attempt document uploads
  - Verify uploads only succeed when Payment_Status is "Confirmed"
  - Run 100+ iterations

- [x] 27.2 Write property test for file size validation
  - **Property 15: File Size Validation**
  - **Validates: Requirements 6.4, 20.2**
  - Generate files of various sizes
  - Verify files > 5MB are rejected
  - Run 100+ iterations

- [x] 27.3 Write property test for reapplication independence
  - **Property 21: Reapplication Independence**
  - **Validates: Requirements 8.3, 8.4, 8.5**
  - Create multiple applications for same user across different intake years
  - Verify each has unique Applicant_ID and independent status
  - Run 100+ iterations


### Epic 7: Admin Dashboard & Application Review

- [x] 29. Build protected admin dashboard
  - Create `app/admin/page.tsx` with role-based authentication middleware
  - Verify user exists in `admissions_officers` table with `is_active = TRUE`
  - Redirect non-officers to 403 Forbidden page
  - Display "Bureau des Admissions" header
  - _Requirements: 9.1, 17.5, 23_

- [x] 30. Create searchable/filterable application table
  - Fetch all applications from database (officers can see all)
  - Display data table with columns: Applicant_ID, Prénom, Nom, Exam Status, Payment_Status, Application_Status
  - Implement client-side search by Applicant_ID, name
  - Implement filters by Payment_Status, Application_Status, Exam Status
  - Add sorting by column headers
  - _Requirements: 9.2-9.3_

- [x] 31. Build application detail view
  - Create `app/admin/applications/[id]/page.tsx`
  - Fetch full application details including applicant profile
  - Display all form data: personal info, academic history, payment info
  - Show list of uploaded documents (Pièces_Justificatives)
  - Implement document preview/download functionality
  - Store current Application_Status version for optimistic locking
  - _Requirements: 9.4-9.6_

- [x] 32. Implement optimistic locking for concurrent edits
  - Load current `version` field when opening application detail view
  - Before status update, call `update_application_status_with_version_check()` RPC
  - Pass expected_version parameter
  - If version mismatch detected, display warning: "Cette candidature a été modifiée par un autre utilisateur. Veuillez actualiser la page."
  - Prevent status change until page is refreshed
  - _Requirements: 11.1-11.4_

- [x] 31.1 Write property test for concurrent edit detection
  - **Property 29: Concurrent Edit Detection**
  - **Validates: Requirements 11.2, 11.3**
  - Simulate concurrent status changes by two officers
  - Verify second change is rejected with version mismatch
  - Run 100+ iterations


### Epic 8: Atomic Admin Decision Workflow

- [x] 33. Create admin-decision Edge Function
  - Create `supabase/functions/admin-decision/index.ts`
  - Accept input: { applicant_id, decision_type ('conditional' | 'final' | 'rejected'), admin_id }
  - Implement atomic transaction wrapper
  - Add structured logging for each operation step
  - Generate unique operation_id for traceability
  - _Requirements: 10.1-10.4, 22.1-22.5_

- [x] 34. Implement PDF generation for acceptance letters
  - Install `@react-pdf/renderer`
  - Create PDF template component for conditional acceptance letter
  - Create PDF template component for final acceptance letter
  - Include Ignito Academy logo from environment variable (PDF_LOGO_URL)
  - Include applicant details: Applicant_ID, Prénom, Nom
  - Add conditional/final acceptance terms in formal academic French
  - Include digital signature image from environment variable (PDF_SIGNATURE_URL)
  - Add footer text from environment variable (PDF_FOOTER_TEXT)
  - Generate PDF buffer
  - _Requirements: 12.1-12.3, 12.6, 13.1-13.3, 13.6, 25.1-25.6_

- [x] 35. Upload generated PDF to official_letters bucket
  - Generate filename: `[APPLICANT_ID]-[DECISION_TYPE]-[TIMESTAMP].pdf`
  - Upload PDF buffer to `official_letters/[intake_year]/[filename]`
  - Store file path for email attachment
  - If upload fails, throw error to trigger rollback
  - _Requirements: 25.7_

- [x] 36. Send decision email with PDF attachment
  - Fetch applicant email from database
  - For conditional acceptance: Subject "Décision d'admission : Offre sous réserve"
  - For final acceptance: Subject "Félicitations : Admission définitive"
  - Compose email body in formal academic French
  - Attach generated PDF from storage
  - Use Supabase email service or Resend
  - Implement retry logic: 3 attempts with exponential backoff
  - Log email attempt in `email_logs` table
  - If email fails after retries, throw error to trigger rollback
  - _Requirements: 12.4-12.5, 13.4-13.5, 21.2-21.4_

- [x] 37. Update application status atomically
  - Call `update_application_status_with_version_check()` with new status
  - For "Admission sous réserve": Update Application_Status
  - For "Admission définitive": Update Application_Status and lock (no further changes)
  - For "Dossier refusé": Update Application_Status and lock
  - If version check fails, throw error to trigger rollback
  - _Requirements: 10.2-10.4_

- [x] 38. Create audit trail record
  - Insert record into `audit_trail` table
  - Include: admin_id, applicant_id, previous_status, new_status, timestamp
  - If insert fails, throw error to trigger rollback
  - _Requirements: 10.7, 14.1-14.2_

- [x] 39. Implement rollback on any failure
  - Wrap all operations in try-catch block
  - On any error: Log failure details, return error response
  - Do NOT commit Application_Status change if PDF generation, upload, or email fails
  - Retain generated PDF in storage for manual retry if needed
  - _Requirements: 12.7, 13.7, 22.2-22.4_

- [x] 40. Add decision action buttons to admin UI
  - In application detail view, add three buttons: "Admission sous réserve", "Admission définitive", "Dossier refusé"
  - Disable all buttons when Application_Status is "Admission définitive"
  - Allow upgrade from "Admission sous réserve" to "Admission définitive"
  - On button click, call admin-decision Edge Function
  - Display success/error messages in French
  - _Requirements: 10.1, 10.5-10.6_

- [x] 39.1 Write property test for atomic decision operation - conditional
  - **Property 30: Atomic Decision Operation - Conditional Acceptance**
  - **Validates: Requirements 12.1, 12.4, 12.5, 12.7, 22.1, 22.2**
  - Generate conditional acceptance decisions
  - Verify all 5 steps execute atomically (PDF, upload, email, status, audit)
  - Simulate failures at each step and verify rollback
  - Run 100+ iterations

- [x] 39.2 Write property test for atomic decision operation - final
  - **Property 31: Atomic Decision Operation - Final Acceptance**
  - **Validates: Requirements 13.1, 13.4, 13.5, 13.7, 22.1, 22.2**
  - Generate final acceptance decisions
  - Verify all 5 steps execute atomically
  - Simulate failures and verify rollback
  - Run 100+ iterations

- [x] 39.3 Write property test for audit trail completeness
  - **Property 32: Audit Trail Completeness**
  - **Validates: Requirements 10.7, 14.1, 14.2**
  - Generate status changes
  - Verify exactly one audit record created for each change
  - Run 100+ iterations

- [x] 39.4 Write property test for status transition validity - final acceptance lock
  - **Property 26: Status Transition Validity - Final Acceptance Lock**
  - **Validates: Requirements 10.5, 24.5**
  - Set Application_Status to "Admission définitive"
  - Attempt further status changes
  - Verify all changes are rejected
  - Run 100+ iterations


### Epic 9: Email System & Retry Logic

- [x] 41. Configure email service integration
  - Choose between Supabase email service or Resend
  - Set up SMTP configuration in environment variables
  - Configure FROM_EMAIL address: admissions@ignitoacademy.cd
  - Test email connectivity
  - _Requirements: 21.1_

- [x] 42. Create email templates in formal academic French
  - Create payment confirmation email template
  - Create conditional acceptance email template
  - Create final acceptance email template
  - Use formal academic tone and proper French grammar
  - Include Ignito Academy branding
  - _Requirements: 5.2, 12.6, 13.6_

- [x] 43. Implement email retry logic with exponential backoff
  - Create `lib/email/send-with-retry.ts` utility function
  - Accept parameters: applicant_id, email_type, email_data, max_retries (default 3)
  - Implement retry loop with exponential backoff: 2^retry_count seconds
  - Log each attempt in `email_logs` table with retry_count
  - Update status to 'sent' on success, 'failed' on exhaustion
  - Return success/failure result
  - _Requirements: 21.2-21.4_

- [x] 42.1 Write property test for email retry logic
  - **Property 39: Email Retry Logic**
  - **Validates: Requirements 21.2, 21.3, 21.4**
  - Simulate email send failures
  - Verify system retries up to 3 times with exponential backoff
  - Verify retry_count recorded in email_logs
  - Run 100+ iterations


### Epic 10: Testing & Property-Based Tests

- [x] 44. Set up testing infrastructure
  - Install Vitest, fast-check, @testing-library/react, Playwright
  - Configure `vitest.config.ts` with test environment
  - Set up test database with Supabase local development
  - Create test utilities and helpers
  - Configure code coverage reporting (target: 80%+)
  - _Requirements: All correctness properties_

- [x] 45. Implement unit tests for critical functions
  - Write unit tests for Applicant_ID generation and parsing
  - Write unit tests for phone number validation
  - Write unit tests for email validation
  - Write unit tests for file upload validation
  - Write unit tests for status transition logic
  - Write unit tests for webhook signature validation
  - Test edge cases: empty inputs, boundary values, special characters
  - Test error conditions: invalid inputs, constraint violations

- [x] 46. Implement property-based tests for all 45 correctness properties
  - [x] 45.1 Properties 1-5: Applicant ID properties (format, round-trip, uniqueness, monotonicity, sequence reset)
  - [x] 45.2 Properties 6-9: Email and phone validation properties (uniqueness, format, round-trip)
  - [x] 45.3 Properties 10-12: Payment workflow properties (initial status, confirmation triggers)
  - [x] 45.4 Properties 13-18: Document upload properties (payment requirement, validation, access control)
  - [x] 45.5 Properties 19-22: Academic history and reapplication properties
  - [x] 45.6 Properties 23-24: Role-based access properties
  - [x] 45.7 Properties 25-28: Status transition validity properties
  - [x] 45.8 Property 29: Concurrent edit detection
  - [x] 45.9 Properties 30-31: Atomic decision operations
  - [x] 45.10 Properties 32-36: Audit trail and PDF properties
  - [x] 45.11 Properties 37-39: Webhook and email properties
  - [x] 45.12 Properties 40-45: Language toggle, intake year, error messages, database constraints
  - Configure each test to run minimum 100 iterations
  - Tag each test with property number and requirements

- [x] 47. Run full test suite and achieve 80%+ coverage
  - Execute: `npm run test:unit`
  - Execute: `npm run test:property`
  - Execute: `npm run test:integration`
  - Generate coverage report
  - Fix any failing tests
  - Ensure all 45 property tests pass


### Epic 11: Deployment & Production Readiness

- [x] 48. Configure production environment variables
  - Set up environment variables in Vercel dashboard
  - Configure Supabase production credentials
  - Set Nomba API production keys
  - Configure email service credentials
  - Set PDF generation asset URLs (logo, signature, footer)
  - Verify all secrets are properly secured
  - _Requirements: All deployment requirements_

- [x] 48. Configure production environment variables
  - ✅ All env vars set in Vercel
  - ✅ Admin account seeded in production DB
  - ✅ Resend domain verified
  - ✅ Deployed at ignitoacademy.com

- [x] 49. Deploy Edge Functions to Supabase
  - ✅ payment-webhook deployed to fspoilopdbxxdbvuzenj
  - ✅ admin-decision deployed to fspoilopdbxxdbvuzenj (fixed syntax error y→y: y-15)
  - ✅ Edge Function secrets set (RESEND_API_KEY, FROM_EMAIL, NOMBA_WEBHOOK_SECRET)
  - Note: generate-applicant-id is a DB function, not an Edge Function — already live

- [x] 50. Deploy Next.js frontend to Vercel
  - ✅ GitHub repository connected to Vercel (auto-deploy on push to main)
  - ✅ Build command: `npm run build` — passing in production
  - ✅ All environment variables set in Vercel (Supabase, Resend, Nomba, PDF assets)
  - ✅ Live at https://ignitoacademy.com — HTTP 200 on /, /apply, /dashboard
  - ✅ Admin portal live at https://ignitoacademy.com/admin

- [ ] 51. Set up monitoring and error tracking
  - Configure Sentry or similar error tracking service
  - Set up Vercel Analytics for frontend performance
  - Configure Supabase Dashboard alerts for database issues
  - Set up log aggregation (LogTail or Datadog)
  - Create alerts for critical errors: payment failures, email failures, atomic operation failures

- [ ] 52. Configure database backups and verify RLS
  - Enable automated daily backups in Supabase
  - Set backup retention to 30 days
  - Enable point-in-time recovery (24-hour window)
  - Verify all RLS policies are active and working
  - Test access control: applicants can only see own data, officers can see all

- [ ] 53. Perform end-to-end production testing
  - Test complete applicant flow: registration → payment → document upload
  - Test admin flow: login → review application → make decision
  - Test payment webhook with real Nomba transaction (test mode)
  - Test email delivery for all notification types
  - Test mobile responsiveness on real devices (iOS Safari, Android Chrome)
  - Verify all French content displays correctly
  - Test concurrent access by multiple users

- [ ] 54. Final checkpoint - Production readiness verification
  - Ensure all tests pass (unit, property-based, integration)
  - Verify 80%+ code coverage achieved
  - Confirm all 45 correctness properties validated
  - Verify all RLS policies active
  - Confirm monitoring and alerts configured
  - Verify database backups enabled
  - Test disaster recovery procedure
  - Document any known issues or limitations
  - Obtain stakeholder approval for production launch


## Notes

### Task Execution Guidelines

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability (format: _Requirements: X.Y_)
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and integration points
- All tasks build incrementally - each task assumes previous tasks are complete

### Implementation Priorities

**Critical Path (Must Have for MVP):**
1. Epic 1: Infrastructure setup (database, auth, storage)
2. Epic 2: Landing page (conversion engine)
3. Epic 3: Applicant registration and profile creation
4. Epic 4: Academic history form
5. Epic 5: Payment integration and webhook
6. Epic 6: Applicant dashboard and document upload
7. Epic 7: Admin dashboard and application review
8. Epic 8: Admin decision workflow (atomic operations)
9. Epic 11: Deployment

**Important (Should Have):**
- Epic 9: Email system with retry logic
- Epic 10: Unit tests and integration tests (subset of property tests)

**Optional (Nice to Have):**
- All property-based tests (marked with `*`)
- Full 80%+ code coverage
- Advanced monitoring and alerting

### Key Technical Decisions

1. **Atomic Operations**: Admin decisions (PDF + Email + Status Update) must execute atomically to prevent inconsistent state
2. **Idempotency**: Webhook processing must be idempotent to handle duplicate notifications from Nomba
3. **Optimistic Locking**: Version field prevents concurrent edit conflicts between admissions officers
4. **Row Level Security**: All database access controlled via RLS policies - no business logic in application layer for authorization
5. **Mobile-First**: All UI components designed for 320px+ screens with 48px minimum touch targets
6. **Formal French**: All user-facing content uses formal academic French style

### Security Considerations

- All passwords hashed with bcrypt (10+ salt rounds)
- All API endpoints protected by authentication middleware
- File uploads validated for size, extension, and MIME type
- Webhook signatures validated using HMAC-SHA256
- Rate limiting on authentication endpoints (5 attempts per 15 minutes)
- CSRF protection on all state-changing operations
- All data transmitted over HTTPS with TLS 1.2+

### Performance Targets

- Landing page load: < 2 seconds on 3G mobile
- Payment webhook processing: < 500ms
- PDF generation: < 3 seconds
- Support 100+ concurrent users without degradation

### Compliance Requirements

- Audit trail retained for 7+ years (NCC Education accreditation)
- Database backups every 6 hours, 30-day retention
- 99.5% uptime during application periods
- All official communications in formal academic French

---

**Document Version:** 1.0  
**Created:** 2026-01-27  
**Status:** Ready for Implementation  
**Estimated Duration:** 6-8 weeks (with full testing) | 3-4 weeks (MVP without property tests)

