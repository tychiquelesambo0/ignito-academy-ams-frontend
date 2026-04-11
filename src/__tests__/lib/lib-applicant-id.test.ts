/**
 * Coverage tests for src/lib/applicant-id.ts
 */
import { describe, it, expect } from 'vitest'
import {
  isValidApplicantId,
  parseApplicantId,
  generateApplicantId,
  formatApplicantId,
  currentIntakeYear,
} from '@/lib/applicant-id'

describe('isValidApplicantId', () => {
  it('accepts well-formed IDs', () => {
    expect(isValidApplicantId('IGN-2026-00001')).toBe(true)
    expect(isValidApplicantId('IGN-2030-99999')).toBe(true)
    expect(isValidApplicantId('IGN-2026-00042')).toBe(true)
  })

  it('rejects wrong prefix', () => {
    expect(isValidApplicantId('ABC-2026-00001')).toBe(false)
    expect(isValidApplicantId('IGN2026-00001')).toBe(false)
  })

  it('rejects wrong sequence length', () => {
    expect(isValidApplicantId('IGN-2026-0001')).toBe(false)   // 4 digits
    expect(isValidApplicantId('IGN-2026-000001')).toBe(false) // 6 digits
  })

  it('rejects wrong year length', () => {
    expect(isValidApplicantId('IGN-26-00001')).toBe(false)
    expect(isValidApplicantId('IGN-20260-00001')).toBe(false)
  })

  it('rejects empty / null', () => {
    expect(isValidApplicantId('')).toBe(false)
    expect(isValidApplicantId(null as unknown as string)).toBe(false)
  })
})

describe('parseApplicantId', () => {
  it('parses a valid ID', () => {
    const p = parseApplicantId('IGN-2026-00042')
    expect(p).not.toBeNull()
    expect(p!.prefix).toBe('IGN')
    expect(p!.year).toBe(2026)
    expect(p!.sequence).toBe(42)
    expect(p!.raw).toBe('IGN-2026-00042')
  })

  it('returns null for invalid IDs', () => {
    expect(parseApplicantId('invalid')).toBeNull()
    expect(parseApplicantId('')).toBeNull()
  })

  it('year and sequence are numbers, not strings', () => {
    const p = parseApplicantId('IGN-2027-00100')!
    expect(typeof p.year).toBe('number')
    expect(typeof p.sequence).toBe('number')
  })
})

describe('generateApplicantId', () => {
  it('generates the correct format', () => {
    expect(generateApplicantId(2026, 1)).toBe('IGN-2026-00001')
    expect(generateApplicantId(2026, 42)).toBe('IGN-2026-00042')
    expect(generateApplicantId(2026, 99999)).toBe('IGN-2026-99999')
  })

  it('zero-pads the sequence to 5 digits', () => {
    expect(generateApplicantId(2026, 1)).toBe('IGN-2026-00001')
    expect(generateApplicantId(2026, 100)).toBe('IGN-2026-00100')
  })

  it('throws RangeError for invalid year', () => {
    expect(() => generateApplicantId(1999, 1)).toThrow(RangeError)
    expect(() => generateApplicantId(10000, 1)).toThrow(RangeError)
    expect(() => generateApplicantId(2026.5, 1)).toThrow(RangeError)
  })

  it('throws RangeError for invalid sequence', () => {
    expect(() => generateApplicantId(2026, 0)).toThrow(RangeError)
    expect(() => generateApplicantId(2026, 100000)).toThrow(RangeError)
    expect(() => generateApplicantId(2026, -1)).toThrow(RangeError)
  })
})

describe('formatApplicantId', () => {
  it('formats a parsed ID back to its original string', () => {
    const original = 'IGN-2026-00042'
    const parsed   = parseApplicantId(original)!
    expect(formatApplicantId(parsed)).toBe(original)
  })

  it('round-trips through parse and format', () => {
    const ids = ['IGN-2026-00001', 'IGN-2030-99999', 'IGN-2027-00100']
    ids.forEach(id => {
      const p = parseApplicantId(id)!
      expect(formatApplicantId(p)).toBe(id)
    })
  })
})

describe('currentIntakeYear', () => {
  it('returns a number >= 2026', () => {
    const year = currentIntakeYear()
    expect(typeof year).toBe('number')
    expect(year).toBeGreaterThanOrEqual(2026)
  })

  it('matches the current calendar year', () => {
    expect(currentIntakeYear()).toBe(new Date().getFullYear())
  })
})
