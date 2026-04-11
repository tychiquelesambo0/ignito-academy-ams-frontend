/**
 * Shared test utilities for Ignito Academy AMS.
 * Used by both unit tests and property-based tests.
 */

import fc from 'fast-check'

// ─── Data factories ────────────────────────────────────────────────────────────

/** Generates a valid Applicant ID string in the IGN-[YEAR]-[SEQ] format. */
export function makeApplicantId(year = 2026, seq = 1): string {
  return `IGN-${year}-${String(seq).padStart(5, '0')}`
}

/** Generates a mock applicant profile. */
export function makeApplicant(overrides?: Partial<MockApplicant>): MockApplicant {
  return {
    id:             crypto.randomUUID(),
    user_id:        crypto.randomUUID(),
    prenom:         'Marie',
    nom:            'Dupont',
    email:          `marie.dupont.${Date.now()}@test.cd`,
    phone_number:   '+243812345678',
    date_naissance: '2000-01-15',
    created_at:     new Date().toISOString(),
    ...overrides,
  }
}

/** Generates a mock application. */
export function makeApplication(overrides?: Partial<MockApplication>): MockApplication {
  return {
    id:                  crypto.randomUUID(),
    applicant_id:        makeApplicantId(),
    user_id:             crypto.randomUUID(),
    intake_year:         2026,
    ecole_provenance:    'Lycée Boyokani',
    option_academique:   'Sciences',
    exam_status:         'Diplôme obtenu',
    application_status:  'Dossier Créé',
    payment_status:      'Pending',
    conditional_message: null,
    transaction_id:      null,
    payment_confirmed_at: null,
    version:             1,
    created_at:          new Date().toISOString(),
    updated_at:          new Date().toISOString(),
    ...overrides,
  }
}

/** Generates a mock uploaded document. */
export function makeDocument(type: DocumentType, overrides?: Partial<MockDocument>): MockDocument {
  return {
    id:               crypto.randomUUID(),
    applicant_id:     makeApplicantId(),
    file_name:        `${type}-document.pdf`,
    file_path:        `applicant-123/${type}_document.pdf`,
    file_size_bytes:  512_000,
    mime_type:        'application/pdf',
    document_type:    type,
    uploaded_at:      new Date().toISOString(),
    ...overrides,
  }
}

// ─── Arbitraries (fast-check) ─────────────────────────────────────────────────

/** Arbitrary that generates valid DRC phone numbers. */
export const arbDrcPhone = fc.stringMatching(/^\+243[0-9]{9}$/)

/** Arbitrary that generates valid email addresses. */
export const arbEmail = fc.emailAddress()

/** Arbitrary that generates valid applicant IDs. */
export const arbApplicantId = fc.record({
  year: fc.integer({ min: 2020, max: 2030 }),
  seq:  fc.integer({ min: 1, max: 99_999 }),
}).map(({ year, seq }) => makeApplicantId(year, seq))

/** Arbitrary that generates a valid application status. */
export const arbApplicationStatus = fc.constantFrom(
  'Dossier Créé',
  'en_cours_devaluation',
  'Admission sous réserve',
  'Admission définitive',
  'Dossier refusé',
)

/** Arbitrary that generates a valid payment status. */
export const arbPaymentStatus = fc.constantFrom(
  'Pending',
  'paid',
  'Confirmed',
  'Failed',
)

/** Arbitrary for document types. */
export const arbDocumentType = fc.constantFrom(
  'identification',
  'diploma',
  'bulletin_10',
  'bulletin_11',
  'bulletin_12',
  'document_conditionnel',
) as fc.Arbitrary<DocumentType>

/** Arbitrary for a realistic file name. */
export const arbFileName = fc.stringMatching(/^[\w\-. ]{1,60}\.(pdf|jpg|jpeg|png)$/)

/** Arbitrary for file sizes (1 byte to 5 MB). */
export const arbFileSize = fc.integer({ min: 1, max: 5 * 1024 * 1024 })

// ─── Assertion helpers ────────────────────────────────────────────────────────

/**
 * Asserts that a value is a valid IGN applicant ID.
 * Format: IGN-[4-digit year]-[5-digit zero-padded seq]
 */
export function assertValidApplicantId(id: string): void {
  const pattern = /^IGN-\d{4}-\d{5}$/
  if (!pattern.test(id)) {
    throw new Error(`Invalid applicant ID format: "${id}" (expected IGN-YYYY-NNNNN)`)
  }
}

/**
 * Asserts that a DRC phone number is correctly formatted.
 * Format: +243 followed by exactly 9 digits (13 chars total).
 */
export function assertValidDrcPhone(phone: string): void {
  const pattern = /^\+243[0-9]{9}$/
  if (!pattern.test(phone)) {
    throw new Error(`Invalid DRC phone: "${phone}" (expected +243XXXXXXXXX)`)
  }
  if (phone.length !== 13) {
    throw new Error(`DRC phone must be 13 chars, got ${phone.length}: "${phone}"`)
  }
}

/**
 * Parses an applicant ID and returns its components.
 * Throws if the format is invalid.
 */
export function parseApplicantId(id: string): { prefix: string; year: number; seq: number } {
  const match = id.match(/^(IGN)-(\d{4})-(\d{5})$/)
  if (!match) throw new Error(`Cannot parse applicant ID: "${id}"`)
  return { prefix: match[1], year: parseInt(match[2], 10), seq: parseInt(match[3], 10) }
}

/**
 * Returns true if `status` is a terminal (non-reversible) application status.
 */
export function isTerminalStatus(status: string): boolean {
  return status === 'Admission définitive' || status === 'Dossier refusé'
}

/**
 * Returns true if the transition from `from` to `to` is a valid admin action.
 */
export function isValidAdminTransition(from: string, to: string): boolean {
  if (isTerminalStatus(from)) return false   // Final states are immutable
  const VALID_TARGETS = ['Admission sous réserve', 'Admission définitive', 'Dossier refusé']
  return VALID_TARGETS.includes(to)
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocumentType =
  | 'identification'
  | 'diploma'
  | 'bulletin_10'
  | 'bulletin_11'
  | 'bulletin_12'
  | 'document_conditionnel'

export interface MockApplicant {
  id:             string
  user_id:        string
  prenom:         string
  nom:            string
  email:          string
  phone_number:   string
  date_naissance: string
  created_at:     string
}

export interface MockApplication {
  id:                   string
  applicant_id:         string
  user_id:              string
  intake_year:          number
  ecole_provenance:     string
  option_academique:    string
  exam_status:          string
  application_status:   string
  payment_status:       string
  conditional_message:  string | null
  transaction_id:       string | null
  payment_confirmed_at: string | null
  version:              number
  created_at:           string
  updated_at:           string
}

export interface MockDocument {
  id:              string
  applicant_id:    string
  file_name:       string
  file_path:       string
  file_size_bytes: number
  mime_type:       string
  document_type:   DocumentType
  uploaded_at:     string
}
