/**
 * Unit tests: Phone number validation
 * Format requirement: +243 followed by exactly 9 digits (13 characters total)
 * Requirements: 2.4 (applicant phone field constraint)
 */

import { describe, it, expect } from 'vitest'

// ─── Pure validation function (mirrors DB CHECK and API-level validation) ─────

function validateDrcPhone(phone: unknown): { valid: boolean; error?: string } {
  if (typeof phone !== 'string' || phone.trim() === '') {
    return { valid: false, error: 'Le numéro de téléphone est requis.' }
  }
  const cleaned = phone.trim()
  if (!cleaned.startsWith('+243')) {
    return { valid: false, error: 'Le numéro doit commencer par +243.' }
  }
  if (cleaned.length !== 13) {
    return { valid: false, error: `Le numéro doit contenir 13 caractères (reçu : ${cleaned.length}).` }
  }
  const digits = cleaned.slice(4)
  if (!/^\d{9}$/.test(digits)) {
    return { valid: false, error: 'Les 9 chiffres après +243 doivent être des chiffres uniquement.' }
  }
  return { valid: true }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Phone number validation — DRC format (+243XXXXXXXXX)', () => {

  // ── Valid numbers ────────────────────────────────────────────────────────────
  describe('valid numbers', () => {
    const valid = [
      '+243812345678',
      '+243970000001',
      '+243990999999',
      '+243800000000',
      '+243850000001',
    ]
    valid.forEach(phone => {
      it(`accepts ${phone}`, () => {
        expect(validateDrcPhone(phone).valid).toBe(true)
      })
    })
  })

  // ── Length invariant ─────────────────────────────────────────────────────────
  it('rejects numbers with 12 characters (one digit short)', () => {
    const r = validateDrcPhone('+24381234567')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/13/)
  })

  it('rejects numbers with 14 characters (one digit extra)', () => {
    const r = validateDrcPhone('+2438123456789')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/13/)
  })

  it('rejects empty string', () => {
    expect(validateDrcPhone('').valid).toBe(false)
  })

  it('rejects null', () => {
    expect(validateDrcPhone(null).valid).toBe(false)
  })

  it('rejects undefined', () => {
    expect(validateDrcPhone(undefined).valid).toBe(false)
  })

  // ── Prefix invariant ─────────────────────────────────────────────────────────
  it('rejects number missing leading +', () => {
    const r = validateDrcPhone('243812345678')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/\+243/)
  })

  it('rejects wrong country code (+225 — Ivory Coast)', () => {
    const r = validateDrcPhone('+225812345678')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/\+243/)
  })

  it('rejects Congolese number with spaces', () => {
    expect(validateDrcPhone('+243 812 345 678').valid).toBe(false)
  })

  it('rejects number with letters after +243', () => {
    const r = validateDrcPhone('+243ABCDEFGHI')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/chiffres/)
  })

  it('rejects number with dash separators', () => {
    expect(validateDrcPhone('+243-812-345-6').valid).toBe(false)
  })

  // ── Boundary edge cases ───────────────────────────────────────────────────────
  it('rejects +243 with only 8 trailing digits', () => {
    const r = validateDrcPhone('+24381234567')
    expect(r.valid).toBe(false)
  })

  it('rejects +243 alone (no trailing digits)', () => {
    expect(validateDrcPhone('+243').valid).toBe(false)
  })

  it('rejects purely numeric string (no +)', () => {
    expect(validateDrcPhone('0812345678').valid).toBe(false)
  })

  it('rejects phone with unicode characters', () => {
    expect(validateDrcPhone('+243８１２３４５６７８').valid).toBe(false)
  })

  it('trims leading/trailing whitespace before checking', () => {
    // +243812345678 with surrounding spaces — trimmed → valid
    expect(validateDrcPhone('  +243812345678  ').valid).toBe(true)
  })

  // ── Error message quality ─────────────────────────────────────────────────────
  it('returns a French error message for missing prefix', () => {
    const r = validateDrcPhone('0812345678')
    expect(typeof r.error).toBe('string')
    expect(r.error!.length).toBeGreaterThan(0)
  })

})
