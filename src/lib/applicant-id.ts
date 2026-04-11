/**
 * Applicant ID generation and parsing utilities.
 *
 * Format: IGN-YYYY-NNNNN
 *   IGN  — constant prefix
 *   YYYY — 4-digit intake year
 *   NNNNN — 5-digit zero-padded sequence number (resets to 00001 each year)
 *
 * Examples: IGN-2026-00001, IGN-2026-00042, IGN-2027-00001
 */

export interface ParsedApplicantId {
  prefix:   'IGN'
  year:     number
  sequence: number
  raw:      string
}

const APPLICANT_ID_RE = /^IGN-(\d{4})-(\d{5})$/

/**
 * Returns true if the string is a valid Applicant ID.
 */
export function isValidApplicantId(id: string): boolean {
  return APPLICANT_ID_RE.test(id)
}

/**
 * Parses an Applicant ID into its components.
 * Returns null for invalid inputs.
 */
export function parseApplicantId(id: string): ParsedApplicantId | null {
  const m = id?.match(APPLICANT_ID_RE)
  if (!m) return null
  return {
    prefix:   'IGN',
    year:     parseInt(m[1], 10),
    sequence: parseInt(m[2], 10),
    raw:      id,
  }
}

/**
 * Generates an Applicant ID from a year and sequence number.
 *
 * @param year     - 4-digit intake year (e.g. 2026)
 * @param sequence - 1-based sequence number (1–99999)
 */
export function generateApplicantId(year: number, sequence: number): string {
  if (!Number.isInteger(year) || year < 2020 || year > 9999) {
    throw new RangeError(`Invalid intake year: ${year}`)
  }
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 99_999) {
    throw new RangeError(`Sequence must be between 1 and 99999, got: ${sequence}`)
  }
  return `IGN-${year}-${String(sequence).padStart(5, '0')}`
}

/**
 * Formats a parsed ID back to its canonical string representation.
 * This is the inverse of `parseApplicantId` (round-trip safe).
 */
export function formatApplicantId(parsed: ParsedApplicantId): string {
  return `${parsed.prefix}-${parsed.year}-${String(parsed.sequence).padStart(5, '0')}`
}

/**
 * Returns the current intake year based on the current date.
 * Intake year >= current calendar year.
 */
export function currentIntakeYear(): number {
  return new Date().getFullYear()
}
