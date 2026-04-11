# Requirements Document: Ignito Academy Admission Management System

## Introduction

Ignito Academy is a distance-learning institution targeting Grade 12 students in the Democratic Republic of Congo (Francophone) preparing for their Examen d'état. The institution offers a 4-year pathway to a UK-accredited degree in partnership with NCC Education.

This document specifies requirements for Phase 1 of the Ignito Academy platform, consisting of:
1. A bilingual landing page (Conversion Engine) optimized for lead generation
2. An Admission Management System (AMS) handling application submission, payment processing, document management, and administrative review workflows

The system serves two primary user groups: prospective students (Applicants) and institutional staff (Admissions Officers).

## Glossary

- **AMS**: Admission Management System - the application portal and administrative interface
- **Applicant**: A prospective student who creates an application profile
- **Applicant_ID**: Unique identifier in format IGN-[INTAKE_YEAR]-[SEQUENTIAL_5_DIGIT]
- **Admissions_Officer**: Administrative user with authority to review and decide on applications
- **Application_Status**: Current state of an application (Dossier Créé, Frais Réglés, En Cours d'Évaluation, Admission sous réserve, Admission définitive, Dossier refusé)
- **Conversion_Engine**: The bilingual landing page designed for lead generation
- **Examen_d_état**: National secondary school exit examination in DR Congo
- **Intake_Year**: Academic year for which the application is submitted
- **Nomba_API**: Payment gateway service for processing Mobile Money transactions in DRC
- **Payment_Status**: State of payment transaction (Pending, Confirmed, Failed)
- **Pièces_Justificatives**: Supporting documents (exam results, certificates)
- **Supabase**: Backend-as-a-Service platform providing PostgreSQL database, authentication, and file storage
- **Webhook**: HTTP callback for asynchronous payment confirmation from Nomba

## Requirements

### Requirement 1: Applicant Profile Creation

**User Story:** As a prospective student, I want to create an application profile with my personal information, so that I can begin the admission process and receive a unique Applicant ID.

#### Acceptance Criteria

1. THE AMS SHALL accept Prénom (first name), Nom (last name), Date de Naissance (date of birth), Téléphone (phone number), Email, and Password as required profile fields
2. WHEN an Applicant submits a complete profile, THE AMS SHALL generate an Applicant_ID in format IGN-[INTAKE_YEAR]-[SEQUENTIAL_5_DIGIT]
3. THE AMS SHALL reset the sequential counter to 00001 at the beginning of each Intake_Year
4. WHEN an Applicant provides an email that already exists in the database, THE AMS SHALL reject the registration and display "Se connecter" prompt
5. WHEN an Applicant provides a phone number that already exists in the database, THE AMS SHALL reject the registration and display "Se connecter" prompt
6. THE AMS SHALL validate that Téléphone begins with +243 country code
7. WHEN profile creation succeeds, THE AMS SHALL set Application_Status to "Dossier Créé"
8. THE AMS SHALL store incomplete or abandoned applications in the database for retargeting purposes

### Requirement 2: Academic History Collection

**User Story:** As an Applicant, I want to provide my academic background information, so that the Admissions_Officer can evaluate my eligibility.

#### Acceptance Criteria

1. THE AMS SHALL accept École de provenance (school name), Option (academic track), and Exam Status as required academic fields
2. THE AMS SHALL provide exactly two Exam Status options: "En attente des résultats" and "Diplôme obtenu"
3. WHEN an Applicant completes academic history entry, THE AMS SHALL save the information to their application record
4. THE AMS SHALL allow Applicants to update academic history before payment confirmation

### Requirement 3: Application Fee Presentation

**User Story:** As an Applicant, I want to see the application fee amount clearly displayed, so that I understand the cost before proceeding to payment.

#### Acceptance Criteria

1. THE AMS SHALL display the application fee as 29 USD
2. THE AMS SHALL indicate that the application fee is non-refundable
3. THE AMS SHALL display fee information in French language

### Requirement 4: Payment Processing Integration

**User Story:** As an Applicant, I want to pay the application fee using Mobile Money, so that I can complete my application submission.

#### Acceptance Criteria

1. THE AMS SHALL accept Applicant_ID as input on the payment page
2. THE AMS SHALL provide selection options for M-Pesa, Orange Money, and Airtel Money payment providers
3. WHEN an Applicant initiates payment, THE AMS SHALL send a payment request to Nomba_API with Applicant_ID, amount, and selected provider
4. THE AMS SHALL set Payment_Status to "Pending" when payment is initiated
5. WHEN Nomba_API sends a webhook confirming successful payment, THE AMS SHALL update Payment_Status to "Confirmed"
6. WHEN Payment_Status changes to "Confirmed", THE AMS SHALL update Application_Status to "Frais Réglés"
7. WHEN Nomba_API sends a webhook indicating payment failure, THE AMS SHALL update Payment_Status to "Failed"
8. WHEN Payment_Status is "Failed", THE AMS SHALL display a "Réessayer le paiement" button to the Applicant
9. THE AMS SHALL allow payment retry using the same Applicant_ID
10. THE AMS SHALL accept payment at any time before the Intake_Year application deadline

### Requirement 5: Payment Confirmation Email

**User Story:** As an Applicant, I want to receive an email confirmation when my payment is successful, so that I know my application is under review.

#### Acceptance Criteria

1. WHEN Payment_Status changes to "Confirmed", THE AMS SHALL send an email with subject "Confirmation de réception de votre dossier d'admission"
2. THE AMS SHALL compose the email in formal academic French
3. THE AMS SHALL include the Applicant_ID in the email body
4. THE AMS SHALL send the email to the Applicant's registered email address

### Requirement 6: Document Upload Management

**User Story:** As an Applicant, I want to upload my Examen d'état results and supporting documents, so that the Admissions_Officer can review my complete application.

#### Acceptance Criteria

1. WHILE Payment_Status is not "Confirmed", THE AMS SHALL disable document upload functionality
2. WHEN Payment_Status is "Confirmed", THE AMS SHALL enable the Pièces_Justificatives upload section
3. THE AMS SHALL accept files with extensions .pdf, .jpg, .jpeg, and .png
4. WHEN an Applicant attempts to upload a file larger than 5MB, THE AMS SHALL reject the upload and display an error message
5. THE AMS SHALL store uploaded files in Supabase Storage
6. THE AMS SHALL associate uploaded files with the Applicant_ID
7. WHEN an Applicant uploads a document, THE AMS SHALL display the filename and upload timestamp

### Requirement 7: Applicant Dashboard and Status Tracking

**User Story:** As an Applicant, I want to view my application status in real-time, so that I know where I am in the admission process.

#### Acceptance Criteria

1. THE AMS SHALL provide an Espace Étudiant dashboard accessible via email and password authentication
2. THE AMS SHALL display Application_Status with possible values: "Dossier Créé", "Frais Réglés", "En Cours d'Évaluation", "Admission sous réserve", "Admission définitive", "Dossier refusé"
3. THE AMS SHALL display the Applicant_ID on the dashboard
4. THE AMS SHALL display the Pièces_Justificatives section with upload status
5. WHEN Payment_Status is "Failed" or "Pending", THE AMS SHALL display payment status and retry option
6. THE AMS SHALL display all dashboard content in French language

### Requirement 8: Reapplication Support

**User Story:** As an Applicant who applied in a previous year, I want to submit a new application for a different Intake_Year, so that I can reapply without creating a new account.

#### Acceptance Criteria

1. WHEN an Applicant has a completed application from a previous Intake_Year, THE AMS SHALL display a "Nouvelle Candidature" button
2. WHEN an Applicant clicks "Nouvelle Candidature", THE AMS SHALL generate a new Applicant_ID for the current Intake_Year
3. THE AMS SHALL link the new Applicant_ID to the same user account
4. THE AMS SHALL preserve historical application data from previous years
5. THE AMS SHALL allow independent processing of applications from different Intake_Years

### Requirement 9: Administrative Application Review Interface

**User Story:** As an Admissions_Officer, I want to view all applications in a searchable table, so that I can efficiently manage the review process.

#### Acceptance Criteria

1. THE AMS SHALL provide a Bureau des Admissions dashboard accessible only to Admissions_Officer users
2. THE AMS SHALL display a data table with columns: Applicant_ID, Prénom, Nom, Exam Status, Payment_Status, Application_Status
3. THE AMS SHALL allow sorting and filtering of the application table
4. WHEN an Admissions_Officer clicks on an application row, THE AMS SHALL display the detailed application view
5. THE AMS SHALL display all uploaded Pièces_Justificatives in the detailed view
6. THE AMS SHALL display all administrative interface content in French language

### Requirement 10: Administrative Decision Actions

**User Story:** As an Admissions_Officer, I want to make admission decisions on applications, so that Applicants receive official responses.

#### Acceptance Criteria

1. THE AMS SHALL provide three decision action buttons: "Admission sous réserve", "Admission définitive", and "Dossier refusé"
2. WHEN an Admissions_Officer clicks "Admission sous réserve", THE AMS SHALL update Application_Status to "Admission sous réserve"
3. WHEN an Admissions_Officer clicks "Admission définitive", THE AMS SHALL update Application_Status to "Admission définitive"
4. WHEN an Admissions_Officer clicks "Dossier refusé", THE AMS SHALL update Application_Status to "Dossier refusé"
5. WHEN Application_Status is "Admission définitive", THE AMS SHALL disable all decision action buttons
6. WHEN Application_Status is "Admission sous réserve", THE AMS SHALL allow upgrade to "Admission définitive"
7. THE AMS SHALL record admin_id, applicant_id, previous_status, new_status, and timestamp for each status change

### Requirement 11: Concurrent Edit Protection

**User Story:** As an Admissions_Officer, I want to be warned if another officer has modified an application I'm viewing, so that I don't overwrite their changes.

#### Acceptance Criteria

1. WHEN an Admissions_Officer opens an application detail view, THE AMS SHALL record the current Application_Status version
2. WHEN an Admissions_Officer attempts to change Application_Status, THE AMS SHALL verify that the current database status matches the version loaded
3. IF the Application_Status has changed since the detail view was loaded, THEN THE AMS SHALL display a warning message and prevent the status change
4. THE AMS SHALL require the Admissions_Officer to refresh the application view before making status changes after a concurrent edit warning

### Requirement 12: Conditional Acceptance Communication

**User Story:** As an Applicant who receives conditional acceptance, I want to receive an official email and PDF letter, so that I have formal documentation of my admission status.

#### Acceptance Criteria

1. WHEN Application_Status changes to "Admission sous réserve", THE AMS SHALL generate a PDF document with Ignito Academy letterhead
2. THE AMS SHALL include the Applicant_ID, Prénom, Nom, and conditional acceptance terms in the PDF
3. THE AMS SHALL include digital signature and footer information from environment variables in the PDF
4. WHEN PDF generation succeeds, THE AMS SHALL send an email with subject "Décision d'admission : Offre sous réserve"
5. THE AMS SHALL attach the generated PDF to the email
6. THE AMS SHALL compose the email and PDF in formal academic French
7. IF PDF generation fails, THEN THE AMS SHALL revert the Application_Status change and SHALL NOT send the email

### Requirement 13: Final Acceptance Communication

**User Story:** As an Applicant who receives final acceptance, I want to receive an official email and PDF letter, so that I have formal documentation of my definitive admission.

#### Acceptance Criteria

1. WHEN Application_Status changes to "Admission définitive", THE AMS SHALL generate a PDF document with Ignito Academy letterhead
2. THE AMS SHALL include the Applicant_ID, Prénom, Nom, and final acceptance confirmation in the PDF
3. THE AMS SHALL include digital signature and footer information from environment variables in the PDF
4. WHEN PDF generation succeeds, THE AMS SHALL send an email with subject "Félicitations : Admission définitive"
5. THE AMS SHALL attach the generated PDF to the email
6. THE AMS SHALL compose the email and PDF in formal academic French
7. IF PDF generation fails, THEN THE AMS SHALL revert the Application_Status change and SHALL NOT send the email

### Requirement 14: Audit Trail for Accreditation

**User Story:** As an institutional administrator, I want a complete audit trail of all admission decisions, so that we can demonstrate compliance to NCC Education accreditation requirements.

#### Acceptance Criteria

1. THE AMS SHALL create an audit record for every Application_Status change
2. THE AMS SHALL store admin_id, applicant_id, previous_status, new_status, and timestamp in each audit record
3. THE AMS SHALL preserve audit records indefinitely
4. THE AMS SHALL provide audit trail export functionality for accreditation reviews
5. THE AMS SHALL ensure audit records cannot be modified or deleted after creation

### Requirement 15: Bilingual Landing Page

**User Story:** As a prospective student or NCC Education reviewer, I want to view the landing page in my preferred language, so that I can understand the program offering.

#### Acceptance Criteria

1. THE Conversion_Engine SHALL display content in French by default
2. THE Conversion_Engine SHALL provide a language toggle between French and English
3. WHEN a user selects English, THE Conversion_Engine SHALL display all content in English
4. WHEN a user selects French, THE Conversion_Engine SHALL display all content in French
5. THE Conversion_Engine SHALL display the hero section, academic pathway timeline, and call-to-action button in the selected language
6. THE Conversion_Engine SHALL display "Déposer un dossier d'admission" as the primary CTA in French
7. THE Conversion_Engine SHALL display "Apply for Admission" as the primary CTA in English

### Requirement 16: Landing Page Design System Compliance

**User Story:** As a user viewing the landing page, I want a consistent and accessible visual experience, so that I can easily navigate and interact with the content.

#### Acceptance Criteria

1. THE Conversion_Engine SHALL use color #021463 for primary navy elements
2. THE Conversion_Engine SHALL use color #4EA6F5 for accent light blue elements
3. THE Conversion_Engine SHALL use color #FFFFFF for white backgrounds
4. THE Conversion_Engine SHALL use color #F8FAFC for off-white backgrounds
5. THE Conversion_Engine SHALL use Larken serif font for h1, h2, h3, and h4 headings
6. THE Conversion_Engine SHALL use Inter sans-serif font for body text and UI elements
7. THE Conversion_Engine SHALL implement mobile-first responsive design
8. THE Conversion_Engine SHALL ensure all interactive elements have minimum 48px touch target size
9. THE Conversion_Engine SHALL use border-radius of 6px (rounded-md) or 8px (rounded-lg) for components

### Requirement 17: Administrative User Management

**User Story:** As a system administrator, I want to control who has Admissions_Officer access, so that only authorized staff can make admission decisions.

#### Acceptance Criteria

1. THE AMS SHALL prevent public registration of Admissions_Officer accounts
2. THE AMS SHALL provide manual account creation functionality for Admissions_Officer users
3. THE AMS SHALL require email and password for Admissions_Officer authentication
4. THE AMS SHALL distinguish between Applicant and Admissions_Officer user roles
5. WHEN an Admissions_Officer attempts to access the Bureau des Admissions dashboard, THE AMS SHALL verify their role authorization

### Requirement 18: Applicant ID Format Validation

**User Story:** As a developer, I want to ensure Applicant IDs follow the correct format, so that the system maintains data integrity.

#### Acceptance Criteria

1. THE AMS SHALL generate Applicant_ID matching the pattern IGN-[4_DIGIT_YEAR]-[5_DIGIT_SEQUENCE]
2. THE AMS SHALL use the current Intake_Year for the year component
3. THE AMS SHALL zero-pad the sequence component to exactly 5 digits
4. THE AMS SHALL increment the sequence for each new application within an Intake_Year
5. FOR ALL generated Applicant_IDs, parsing the ID then formatting it SHALL produce an equivalent ID (round-trip property)

### Requirement 19: Payment Webhook Processing

**User Story:** As a system operator, I want payment confirmations to be processed reliably via webhooks, so that payment status updates are accurate even if users close their browser.

#### Acceptance Criteria

1. THE AMS SHALL expose a webhook endpoint for Nomba_API callbacks
2. WHEN Nomba_API sends a payment success webhook, THE AMS SHALL update Payment_Status to "Confirmed"
3. WHEN Nomba_API sends a payment failure webhook, THE AMS SHALL update Payment_Status to "Failed"
4. THE AMS SHALL verify webhook authenticity using Nomba_API signature validation
5. THE AMS SHALL process webhooks idempotently to handle duplicate notifications
6. THE AMS SHALL log all webhook receipts with timestamp and payload for debugging

### Requirement 20: File Upload Security

**User Story:** As a system administrator, I want uploaded files to be validated and stored securely, so that the system is protected from malicious uploads.

#### Acceptance Criteria

1. THE AMS SHALL validate file extensions against the allowed list: .pdf, .jpg, .jpeg, .png
2. THE AMS SHALL validate file size does not exceed 5MB
3. THE AMS SHALL scan file MIME type to verify it matches the file extension
4. THE AMS SHALL generate unique storage paths for uploaded files to prevent overwrites
5. THE AMS SHALL associate file storage paths with Applicant_ID in the database
6. THE AMS SHALL restrict file access to the owning Applicant and Admissions_Officer users

### Requirement 21: Email Delivery Reliability

**User Story:** As an Applicant, I want to reliably receive email notifications at critical application milestones, so that I stay informed of my application progress.

#### Acceptance Criteria

1. THE AMS SHALL use Supabase email service for all transactional emails
2. WHEN an email send operation fails, THE AMS SHALL log the failure with Applicant_ID and error details
3. THE AMS SHALL retry failed email sends up to 3 times with exponential backoff
4. THE AMS SHALL record email send status (sent, failed, pending) in the database
5. THE AMS SHALL provide an administrative interface to view email delivery status

### Requirement 22: Atomic Decision Operations

**User Story:** As an Admissions_Officer, I want admission decisions to be processed atomically, so that Applicants don't receive incomplete or inconsistent communications.

#### Acceptance Criteria

1. WHEN an Admissions_Officer changes Application_Status to "Admission sous réserve" or "Admission définitive", THE AMS SHALL execute PDF generation, email sending, and status update as a single atomic operation
2. IF PDF generation fails, THEN THE AMS SHALL NOT update Application_Status and SHALL NOT send email
3. IF email sending fails after PDF generation succeeds, THEN THE AMS SHALL NOT update Application_Status and SHALL retain the PDF for retry
4. WHEN all operations succeed, THE AMS SHALL commit the Application_Status change to the database
5. THE AMS SHALL log the outcome of each atomic operation for troubleshooting

### Requirement 23: Phone Number Validation

**User Story:** As a system operator, I want phone numbers to be validated for DR Congo format, so that we can reliably contact Applicants via SMS or WhatsApp.

#### Acceptance Criteria

1. THE AMS SHALL require phone numbers to begin with +243 country code
2. THE AMS SHALL validate that phone numbers contain exactly 13 characters ('+243' followed by 9 digits)
3. WHEN an Applicant enters a phone number without +243, THE AMS SHALL reject the input and display format guidance
4. THE AMS SHALL store phone numbers in E.164 format
5. FOR ALL valid phone numbers, formatting then parsing then formatting SHALL produce an equivalent phone number (round-trip property)

### Requirement 24: Application Status Transition Rules

**User Story:** As a system operator, I want application status transitions to follow valid business rules, so that applications don't enter invalid states.

#### Acceptance Criteria

1. THE AMS SHALL allow transition from "Dossier Créé" to "Frais Réglés" only when Payment_Status is "Confirmed"
2. THE AMS SHALL allow transition from "Frais Réglés" to "En Cours d'Évaluation" when an Admissions_Officer opens the application
3. THE AMS SHALL allow transition from "En Cours d'Évaluation" to "Admission sous réserve", "Admission définitive", or "Dossier refusé"
4. THE AMS SHALL allow transition from "Admission sous réserve" to "Admission définitive"
5. THE AMS SHALL prevent transition from "Admission définitive" to any other status
6. THE AMS SHALL prevent transition from "Dossier refusé" to any other status
7. FOR ALL status transitions, applying valid transitions in any order SHALL result in a valid final state (confluence property)

### Requirement 25: PDF Document Generation

**User Story:** As an Applicant receiving an admission decision, I want to receive a professionally formatted PDF letter, so that I have official documentation for enrollment.

#### Acceptance Criteria

1. THE AMS SHALL generate PDF documents using react-pdf or HTML-to-PDF library
2. THE AMS SHALL include Ignito Academy logo in the PDF letterhead
3. THE AMS SHALL include digital signature image from environment variable in the PDF
4. THE AMS SHALL include footer text from environment variable in the PDF
5. THE AMS SHALL format all PDF content in formal academic French
6. THE AMS SHALL include Applicant_ID, Prénom, Nom, and decision-specific content in the PDF body
7. THE AMS SHALL generate PDF filenames in format [APPLICANT_ID]-[DECISION_TYPE]-[TIMESTAMP].pdf

### Requirement 26: Frontend Polling for Payment Status

**User Story:** As an Applicant waiting for payment confirmation, I want the interface to automatically update when my payment is confirmed, so that I don't need to manually refresh the page.

#### Acceptance Criteria

1. WHILE Payment_Status is "Pending", THE AMS SHALL poll the Supabase database every 5 seconds
2. WHEN Payment_Status changes to "Confirmed", THE AMS SHALL update the UI to display "Frais Réglés" status
3. WHEN Payment_Status changes to "Failed", THE AMS SHALL update the UI to display the "Réessayer le paiement" button
4. THE AMS SHALL stop polling when Payment_Status is "Confirmed" or when the user navigates away from the payment page
5. THE AMS SHALL display a loading indicator while polling is active

### Requirement 27: Intake Year Management

**User Story:** As a system administrator, I want the system to automatically use the correct Intake_Year for new applications, so that Applicant_IDs are generated correctly.

#### Acceptance Criteria

1. THE AMS SHALL determine Intake_Year based on the current calendar date and academic cycle configuration
2. THE AMS SHALL use Intake_Year 2026 for applications created between September 2025 and August 2026
3. THE AMS SHALL increment Intake_Year annually on September 1st
4. THE AMS SHALL reset the Applicant_ID sequence counter to 00001 when Intake_Year changes
5. THE AMS SHALL allow manual override of Intake_Year for testing purposes in non-production environments

### Requirement 28: Responsive Design Implementation

**User Story:** As an Applicant using a mobile device, I want the application interface to be fully functional on my phone, so that I can complete my application without a computer.

#### Acceptance Criteria

1. THE AMS SHALL implement mobile-first responsive design for all user interfaces
2. THE AMS SHALL ensure all forms are usable on screens as small as 320px width
3. THE AMS SHALL ensure all interactive elements have minimum 48px touch target size
4. THE AMS SHALL optimize file upload interface for mobile camera capture
5. THE AMS SHALL test responsive layouts on iOS Safari and Android Chrome browsers

### Requirement 29: Error Message Localization

**User Story:** As a French-speaking Applicant, I want all error messages displayed in French, so that I can understand what went wrong and how to fix it.

#### Acceptance Criteria

1. THE AMS SHALL display all validation error messages in French for Applicant-facing interfaces
2. THE AMS SHALL display all system error messages in French for Applicant-facing interfaces
3. THE AMS SHALL provide user-friendly error messages that explain how to resolve the issue
4. THE AMS SHALL display technical error details only in administrative interfaces
5. THE AMS SHALL log detailed error information for debugging while showing simplified messages to users

### Requirement 30: Database Schema Integrity

**User Story:** As a developer, I want the database schema to enforce data integrity constraints, so that invalid data cannot be stored.

#### Acceptance Criteria

1. THE AMS SHALL enforce uniqueness constraint on email field in the applicants table
2. THE AMS SHALL enforce uniqueness constraint on phone_number field in the applicants table
3. THE AMS SHALL enforce uniqueness constraint on Applicant_ID field in the applications table
4. THE AMS SHALL enforce foreign key constraint between applications and applicants tables
5. THE AMS SHALL enforce foreign key constraint between audit_trail and admissions_officers tables
6. THE AMS SHALL enforce NOT NULL constraint on required fields: Prénom, Nom, Date de Naissance, Email, Téléphone
7. THE AMS SHALL enforce CHECK constraint on Application_Status to allow only valid status values
8. THE AMS SHALL enforce CHECK constraint on Payment_Status to allow only valid status values

## Non-Functional Requirements

### Performance

1. THE AMS SHALL load the landing page in less than 2 seconds on 3G mobile connections
2. THE AMS SHALL process payment webhook callbacks within 500 milliseconds
3. THE AMS SHALL generate PDF documents within 3 seconds
4. THE AMS SHALL support at least 100 concurrent Applicants without performance degradation

### Security

1. THE AMS SHALL encrypt all passwords using bcrypt with minimum 10 salt rounds
2. THE AMS SHALL transmit all data over HTTPS with TLS 1.2 or higher
3. THE AMS SHALL implement CSRF protection on all state-changing operations
4. THE AMS SHALL validate and sanitize all user inputs to prevent SQL injection
5. THE AMS SHALL implement rate limiting on authentication endpoints (5 attempts per 15 minutes)

### Availability

1. THE AMS SHALL maintain 99.5% uptime during application periods
2. THE AMS SHALL implement database backups every 6 hours
3. THE AMS SHALL retain database backups for 30 days

### Compliance

1. THE AMS SHALL comply with NCC Education accreditation audit requirements
2. THE AMS SHALL maintain audit trails for minimum 7 years
3. THE AMS SHALL use formal academic French in all official communications and documents

## Correctness Properties for Property-Based Testing

### Property 1: Applicant ID Uniqueness
FOR ALL applications created within the same Intake_Year, no two applications SHALL have the same Applicant_ID.

### Property 2: Applicant ID Format Invariant
FOR ALL generated Applicant_IDs, the format SHALL match IGN-[4_DIGIT_YEAR]-[5_DIGIT_SEQUENCE] where YEAR is a valid Intake_Year and SEQUENCE is between 00001 and 99999.

### Property 3: Applicant ID Round-Trip
FOR ALL valid Applicant_IDs, parsing the ID to extract year and sequence components, then formatting those components back to a string, SHALL produce the original Applicant_ID.

### Property 4: Email Uniqueness Invariant
FOR ALL applicants in the database, no two applicants SHALL have the same email address.

### Property 5: Phone Number Uniqueness Invariant
FOR ALL applicants in the database, no two applicants SHALL have the same phone_number.

### Property 6: Phone Number Format Invariant
FOR ALL stored phone numbers, the format SHALL match +243[9_DIGITS].

### Property 7: Phone Number Round-Trip
FOR ALL valid phone numbers, formatting to E.164, parsing to extract components, then formatting again SHALL produce the original phone number.

### Property 8: Status Transition Validity
FOR ALL Application_Status transitions, the transition SHALL be one of the allowed transitions defined in Requirement 24.

### Property 9: Payment Before Document Upload
FOR ALL applications, IF Pièces_Justificatives are uploaded, THEN Payment_Status SHALL be "Confirmed".

### Property 10: Atomic Decision Operation
FOR ALL admission decision operations, IF Application_Status changes to "Admission sous réserve" or "Admission définitive", THEN exactly one PDF SHALL be generated AND exactly one email SHALL be sent.

### Property 11: Audit Trail Completeness
FOR ALL Application_Status changes, exactly one audit record SHALL exist with matching applicant_id, previous_status, and new_status.

### Property 12: Audit Trail Immutability
FOR ALL audit records, once created, the record SHALL never be modified or deleted.

### Property 13: Sequence Counter Reset
FOR ALL Intake_Year transitions, the first Applicant_ID generated in the new year SHALL have sequence 00001.

### Property 14: Idempotent Webhook Processing
FOR ALL payment webhooks received multiple times with the same transaction ID, the Payment_Status SHALL be updated exactly once.

### Property 15: File Size Validation
FOR ALL uploaded files, the file size SHALL be less than or equal to 5MB.

### Property 16: File Extension Validation
FOR ALL uploaded files, the file extension SHALL be one of: .pdf, .jpg, .jpeg, .png.

### Property 17: Concurrent Edit Detection
FOR ALL Application_Status change attempts, IF another Admissions_Officer has modified the application since it was loaded, THEN the change SHALL be rejected.

### Property 18: Status Lock After Final Decision
FOR ALL applications with Application_Status "Admission définitive", no further status changes SHALL be allowed.

### Property 19: Reapplication Independence
FOR ALL applicants with multiple applications across different Intake_Years, each application SHALL have a unique Applicant_ID and SHALL be processed independently.

### Property 20: Language Toggle Idempotence
FOR ALL language toggle operations on the Conversion_Engine, toggling from French to English and back to French SHALL display the same French content (idempotence property).

---

**Document Version:** 1.0  
**Created:** 2026-01-27  
**Status:** Initial Draft for Review
