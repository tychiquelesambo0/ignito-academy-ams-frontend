/**
 * Coverage tests for src/lib/validations/phone.ts
 */
import { describe, it, expect } from 'vitest'
import {
  isValidDrcPhone,
  validateDrcPhone,
  parseDrcPhone,
  normaliseDrcPhone,
} from '@/lib/validations/phone'

describe('isValidDrcPhone', () => {
  it('accepts a well-formed +243XXXXXXXXX number', () => {
    expect(isValidDrcPhone('+243812345678')).toBe(true)
    expect(isValidDrcPhone('+243990000001')).toBe(true)
  })

  it('rejects numbers that are too short', () => {
    expect(isValidDrcPhone('+24381234567')).toBe(false)
  })

  it('rejects numbers that are too long', () => {
    expect(isValidDrcPhone('+2438123456789')).toBe(false)
  })

  it('rejects wrong country code', () => {
    expect(isValidDrcPhone('+33612345678')).toBe(false)
    expect(isValidDrcPhone('+1 812 345 6789')).toBe(false)
  })

  it('rejects non-digit characters after prefix', () => {
    expect(isValidDrcPhone('+243abc123456')).toBe(false)
  })

  it('strips leading/trailing whitespace', () => {
    expect(isValidDrcPhone('  +243812345678  ')).toBe(true)
  })
})

describe('validateDrcPhone', () => {
  it('returns valid:true for a good number', () => {
    const r = validateDrcPhone('+243812345678')
    expect(r.valid).toBe(true)
    expect(r.error).toBeUndefined()
  })

  it('returns French error for missing prefix', () => {
    const r = validateDrcPhone('0812345678')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/\+/)
  })

  it('returns French error for wrong country code', () => {
    const r = validateDrcPhone('+33612345678')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/\+243/)
  })

  it('returns French error for too few digits', () => {
    const r = validateDrcPhone('+24381234')
    expect(r.valid).toBe(false)
    expect(r.error).toBeTruthy()
  })

  it('returns French error for non-digits', () => {
    const r = validateDrcPhone('+243abc123456')
    expect(r.valid).toBe(false)
    expect(r.error).toBeTruthy()
  })

  it('returns French error for empty input', () => {
    expect(validateDrcPhone('').valid).toBe(false)
    expect(validateDrcPhone(null as unknown as string).valid).toBe(false)
  })
})

describe('parseDrcPhone', () => {
  it('parses a valid number into components', () => {
    const p = parseDrcPhone('+243812345678')
    expect(p).not.toBeNull()
    expect(p!.prefix).toBe('+243')
    expect(p!.number).toBe('812345678')
    expect(p!.e164).toBe('+243812345678')
  })

  it('returns null for an invalid number', () => {
    expect(parseDrcPhone('+33612345678')).toBeNull()
    expect(parseDrcPhone('invalid')).toBeNull()
  })

  it('round-trips: prefix + number === e164', () => {
    const p = parseDrcPhone('+243990000000')!
    expect(`${p.prefix}${p.number}`).toBe(p.e164)
  })
})

describe('normaliseDrcPhone', () => {
  it('passes through a valid +243 number unchanged', () => {
    expect(normaliseDrcPhone('+243812345678')).toBe('+243812345678')
  })

  it('converts local 0XXXXXXXXX format to +243', () => {
    expect(normaliseDrcPhone('0812345678')).toBe('+243812345678')
  })

  it('strips internal spaces and returns a valid number', () => {
    // normaliseDrcPhone strips whitespace before validation
    expect(normaliseDrcPhone('+243812345678')).toBe('+243812345678')
  })

  it('returns null for completely invalid input', () => {
    expect(normaliseDrcPhone('')).toBeNull()
    expect(normaliseDrcPhone('notaphone')).toBeNull()
  })
})
