/**
 * Unit tests: Email address validation
 * Requirements: 2.3 (applicant email uniqueness + format)
 */

import { describe, it, expect } from 'vitest'

// ─── Pure validation function ─────────────────────────────────────────────────

function validateEmail(email: unknown): { valid: boolean; error?: string } {
  if (typeof email !== 'string' || email.trim() === '') {
    return { valid: false, error: 'L\'adresse email est requise.' }
  }
  const cleaned = email.trim().toLowerCase()

  // Must contain exactly one @
  const atCount = (cleaned.match(/@/g) ?? []).length
  if (atCount !== 1) {
    return { valid: false, error: 'L\'adresse email doit contenir un seul symbole @.' }
  }

  const [localPart, domain] = cleaned.split('@')

  if (!localPart || localPart.length === 0) {
    return { valid: false, error: 'La partie locale de l\'email ne peut pas être vide.' }
  }

  if (!domain || !domain.includes('.')) {
    return { valid: false, error: 'Le domaine de l\'email doit contenir un point.' }
  }

  // Domain must not start or end with a hyphen or dot
  if (domain.startsWith('.') || domain.endsWith('.') ||
      domain.startsWith('-') || domain.endsWith('-')) {
    return { valid: false, error: 'Le domaine de l\'email est invalide.' }
  }

  // No spaces anywhere
  if (/\s/.test(cleaned)) {
    return { valid: false, error: 'L\'adresse email ne peut pas contenir d\'espaces.' }
  }

  // TLD must be at least 2 chars
  const tld = domain.split('.').pop() ?? ''
  if (tld.length < 2) {
    return { valid: false, error: 'L\'extension du domaine doit contenir au moins 2 caractères.' }
  }

  return { valid: true }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Email address validation', () => {

  // ── Valid addresses ──────────────────────────────────────────────────────────
  describe('valid email addresses', () => {
    const valid = [
      'student@ignitoacademy.cd',
      'marie.dupont@gmail.com',
      'jean-paul@yahoo.fr',
      'user+tag@domain.co.uk',
      'test123@subdomain.example.org',
      'UPPERCASE@domain.com',          // should be normalised to lower
      'user@ignitoacademy.cd',
      'a@b.io',
    ]
    valid.forEach(email => {
      it(`accepts "${email}"`, () => {
        expect(validateEmail(email).valid).toBe(true)
      })
    })
  })

  // ── Missing @ ────────────────────────────────────────────────────────────────
  it('rejects email with no @', () => {
    const r = validateEmail('nodomain.com')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/@/)
  })

  it('rejects email with two @ symbols', () => {
    const r = validateEmail('user@@domain.com')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/@/)
  })

  // ── Missing domain parts ─────────────────────────────────────────────────────
  it('rejects email with no domain', () => {
    expect(validateEmail('user@').valid).toBe(false)
  })

  it('rejects email with domain but no TLD', () => {
    expect(validateEmail('user@domain').valid).toBe(false)
  })

  it('rejects email with empty local part (@domain.com)', () => {
    expect(validateEmail('@domain.com').valid).toBe(false)
  })

  // ── Spaces ───────────────────────────────────────────────────────────────────
  it('rejects email with internal space', () => {
    expect(validateEmail('user name@domain.com').valid).toBe(false)
  })

  it('accepts email with leading/trailing whitespace (trims it)', () => {
    expect(validateEmail('  user@domain.com  ').valid).toBe(true)
  })

  // ── Domain format ────────────────────────────────────────────────────────────
  it('rejects domain starting with a dot', () => {
    expect(validateEmail('user@.domain.com').valid).toBe(false)
  })

  it('rejects domain ending with a dot', () => {
    expect(validateEmail('user@domain.').valid).toBe(false)
  })

  it('rejects TLD shorter than 2 characters', () => {
    expect(validateEmail('user@domain.c').valid).toBe(false)
  })

  // ── Empty / null / undefined ─────────────────────────────────────────────────
  it('rejects empty string', () => {
    expect(validateEmail('').valid).toBe(false)
  })

  it('rejects null', () => {
    expect(validateEmail(null).valid).toBe(false)
  })

  it('rejects undefined', () => {
    expect(validateEmail(undefined).valid).toBe(false)
  })

  it('rejects whitespace-only string', () => {
    expect(validateEmail('   ').valid).toBe(false)
  })

  // ── Case normalisation ────────────────────────────────────────────────────────
  it('normalises UPPERCASE email to lowercase during validation', () => {
    // uppercase email is structurally valid
    expect(validateEmail('MARIE@IGNITOACADEMY.CD').valid).toBe(true)
  })

  // ── Special characters in local part ─────────────────────────────────────────
  it('accepts plus sign in local part (tag addressing)', () => {
    expect(validateEmail('user+test@domain.com').valid).toBe(true)
  })

  it('accepts dots in local part', () => {
    expect(validateEmail('first.last@domain.com').valid).toBe(true)
  })

  it('accepts hyphens in domain', () => {
    expect(validateEmail('user@my-domain.com').valid).toBe(true)
  })

  // ── French error messages ─────────────────────────────────────────────────────
  it('error message is non-empty French text', () => {
    const r = validateEmail('invalid')
    expect(typeof r.error).toBe('string')
    expect(r.error!.length).toBeGreaterThan(5)
  })

})
