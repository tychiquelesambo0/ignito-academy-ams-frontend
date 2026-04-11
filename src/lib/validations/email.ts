/**
 * Email validation utilities.
 * Complements the Zod schema in auth.ts with pure-function helpers.
 */

export interface EmailValidationResult {
  valid:  boolean
  error?: string
}

const EMAIL_RE =
  /^[a-zA-Z0-9._%+\-']+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

/**
 * Returns true if the email is structurally valid.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const t = email.trim().toLowerCase()
  if (/\s/.test(t)) return false
  const atCount = (t.match(/@/g) ?? []).length
  if (atCount !== 1) return false
  const [local, domain] = t.split('@')
  if (!local || !domain) return false
  if (!domain.includes('.')) return false
  const tld = domain.split('.').pop() ?? ''
  if (tld.length < 2) return false
  return EMAIL_RE.test(t)
}

/**
 * Validates an email and returns a result with a French error message.
 */
export function validateEmail(email: string): EmailValidationResult {
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return { valid: false, error: 'L\'adresse email est requise.' }
  }

  const t = email.trim()

  if (/\s/.test(t)) {
    return { valid: false, error: 'L\'adresse email ne peut pas contenir d\'espaces.' }
  }

  const atCount = (t.match(/@/g) ?? []).length
  if (atCount === 0) {
    return { valid: false, error: 'L\'adresse email doit contenir le symbole @.' }
  }
  if (atCount > 1) {
    return { valid: false, error: 'L\'adresse email ne peut contenir qu\'un seul @.' }
  }

  const [local, domain] = t.split('@')
  if (!local) {
    return { valid: false, error: 'L\'adresse email doit comporter une partie locale avant le @.' }
  }

  if (!domain || !domain.includes('.')) {
    return { valid: false, error: 'Le domaine de l\'adresse email est invalide.' }
  }

  const tld = domain.split('.').pop() ?? ''
  if (tld.length < 2) {
    return { valid: false, error: 'L\'extension du domaine est invalide.' }
  }

  if (!EMAIL_RE.test(t.toLowerCase())) {
    return { valid: false, error: 'L\'adresse email n\'est pas valide.' }
  }

  return { valid: true }
}

/**
 * Normalises an email to lowercase (for uniqueness checks).
 */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}
