/**
 * DRC Phone number validation utilities.
 * Valid format: +243XXXXXXXXX (13 characters total, 9 digits after country code)
 */

export interface PhoneValidationResult {
  valid:   boolean
  error?:  string
}

export interface ParsedPhone {
  prefix: string  // '+243'
  number: string  // 9 digit string
  e164:   string  // '+243XXXXXXXXX'
}

/**
 * Returns true if the phone number strictly matches +243XXXXXXXXX
 */
export function isValidDrcPhone(phone: string): boolean {
  const t = phone.trim()
  return /^\+243\d{9}$/.test(t) && t.length === 13
}

/**
 * Validates a DRC phone number and returns a result object.
 * All error messages are in formal French.
 */
export function validateDrcPhone(phone: string): PhoneValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Le numéro de téléphone est requis.' }
  }

  const t = phone.trim()

  if (!t.startsWith('+')) {
    return { valid: false, error: 'Le numéro doit commencer par + suivi de l\'indicatif pays.' }
  }

  if (!t.startsWith('+243')) {
    return { valid: false, error: 'L\'indicatif pays doit être +243 pour la RDC.' }
  }

  const digits = t.slice(4)

  if (digits.length !== 9) {
    return { valid: false, error: 'Le numéro de téléphone doit contenir 9 chiffres après +243.' }
  }

  if (!/^\d{9}$/.test(digits)) {
    return { valid: false, error: 'Le numéro ne peut contenir que des chiffres après +243.' }
  }

  return { valid: true }
}

/**
 * Parses a valid DRC phone number into its components.
 * Returns null for invalid inputs.
 */
export function parseDrcPhone(phone: string): ParsedPhone | null {
  if (!isValidDrcPhone(phone)) return null
  const t = phone.trim()
  return {
    prefix: '+243',
    number: t.slice(4),
    e164:   t,
  }
}

/**
 * Normalises a phone number to E.164 format (+243XXXXXXXXX).
 * Strips leading zeros and spaces.
 * Returns null if the result is not a valid DRC number.
 */
export function normaliseDrcPhone(raw: string): string | null {
  if (!raw) return null
  const stripped = raw.replace(/\s+/g, '')

  // Already in +243 format
  if (isValidDrcPhone(stripped)) return stripped

  // Local format: 0XXXXXXXXX (10 chars)
  if (/^0\d{9}$/.test(stripped)) {
    const candidate = `+243${stripped.slice(1)}`
    return isValidDrcPhone(candidate) ? candidate : null
  }

  return null
}
