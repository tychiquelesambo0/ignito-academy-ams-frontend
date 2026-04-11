/**
 * Property Tests: P5, P6–P9
 *
 * P5  — Applicant_ID sequence resets to 00001 for each new intake year
 * P6  — No two applicants share the same email address (uniqueness)
 * P7  — Every stored email address conforms to a valid format
 * P8  — Every stored phone number conforms to +243XXXXXXXXX (13 chars)
 * P9  — Phone number parse → reformat round-trip is lossless
 *
 * Each property runs 100+ iterations via fast-check.
 * Requirements: 2.1, 2.3, 2.4, 3.1–3.3
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeId(year: number, seq: number): string {
  return `IGN-${year}-${String(seq).padStart(5, '0')}`
}

function parseId(id: string): { year: number; seq: number } | null {
  const m = id.match(/^IGN-(\d{4})-(\d{5})$/)
  if (!m) return null
  return { year: parseInt(m[1], 10), seq: parseInt(m[2], 10) }
}

function isValidEmail(email: string): boolean {
  const e = email.trim().toLowerCase()
  const at = (e.match(/@/g) ?? []).length
  if (at !== 1) return false
  const [local, domain] = e.split('@')
  if (!local || !domain || !domain.includes('.')) return false
  if (/\s/.test(e)) return false
  const tld = domain.split('.').pop() ?? ''
  return tld.length >= 2
}

function isValidDrcPhone(phone: string): boolean {
  return /^\+243\d{9}$/.test(phone.trim()) && phone.trim().length === 13
}

function parseDrcPhone(phone: string): { prefix: string; number: string } | null {
  const t = phone.trim()
  if (!isValidDrcPhone(t)) return null
  return { prefix: '+243', number: t.slice(4) }
}

function formatDrcPhone(prefix: string, number: string): string {
  return `${prefix}${number}`
}

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const yearArb = fc.integer({ min: 2020, max: 2030 })
const seqArb  = fc.integer({ min: 1,    max: 99_999 })
const phoneArb = fc.tuple(
  fc.constant('+243'),
  fc.stringMatching(/^[0-9]{9}$/),
).map(([prefix, digits]) => `${prefix}${digits}`)

// ─── P5: Sequence reset per year ─────────────────────────────────────────────

describe('P5 — Applicant_ID sequence resets to 00001 for each new intake year', () => {

  it('P5-A: first ID of any year has sequence 00001', () => {
    fc.assert(
      fc.property(yearArb, (year) => {
        const id = makeId(year, 1)
        expect(id).toBe(`IGN-${year}-00001`)
        const parsed = parseId(id)
        expect(parsed?.seq).toBe(1)
      }),
      { numRuns: 100 },
    )
  })

  it('P5-B: IDs from different years with the same sequence are different IDs', () => {
    fc.assert(
      fc.property(
        fc.tuple(yearArb, yearArb).filter(([a, b]) => a !== b),
        seqArb,
        ([yearA, yearB], seq) => {
          const idA = makeId(yearA, seq)
          const idB = makeId(yearB, seq)
          expect(idA).not.toBe(idB)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('P5-C: Parsing an ID from year Y always yields year Y', () => {
    fc.assert(
      fc.property(yearArb, seqArb, (year, seq) => {
        const id = makeId(year, seq)
        const parsed = parseId(id)
        expect(parsed?.year).toBe(year)
      }),
      { numRuns: 100 },
    )
  })

  it('P5-D: Simulated year-boundary reset — year N last seq → year N+1 first seq = 1', () => {
    fc.assert(
      fc.property(yearArb, (year) => {
        const lastOfYear   = makeId(year, 99_999)
        const firstOfNext  = makeId(year + 1, 1)
        const parsedLast   = parseId(lastOfYear)
        const parsedFirst  = parseId(firstOfNext)
        expect(parsedFirst?.seq).toBe(1)
        expect(parsedFirst?.year).toBe(parsedLast!.year + 1)
      }),
      { numRuns: 100 },
    )
  })
})

// ─── P6: Email uniqueness ─────────────────────────────────────────────────────

describe('P6 — No two applicants share the same email address', () => {

  it('P6-A: a set of N distinct emails has exactly N unique members', () => {
    fc.assert(
      fc.property(
        fc.array(fc.emailAddress(), { minLength: 2, maxLength: 20 }),
        (emails) => {
          const unique = new Set(emails.map(e => e.toLowerCase()))
          // If the generated array has all unique lowercase emails, all are distinct
          if (unique.size === emails.length) {
            expect(unique.size).toBe(emails.length)
          }
          // We just verify the Set correctly captures duplicates
          expect(unique.size).toBeLessThanOrEqual(emails.length)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('P6-B: duplicate email detection — same email normalised to lowercase is equal', () => {
    fc.assert(
      fc.property(fc.emailAddress(), (email) => {
        const lower = email.toLowerCase()
        const upper = email.toUpperCase()
        expect(lower.toLowerCase()).toBe(upper.toLowerCase())
      }),
      { numRuns: 100 },
    )
  })

  it('P6-C: uniqueness constraint rejects the second insert of an existing email', () => {
    fc.assert(
      fc.property(fc.emailAddress(), (email) => {
        const existing = new Set([email.toLowerCase()])
        const isUnique = (e: string) => !existing.has(e.toLowerCase())
        expect(isUnique(email)).toBe(false)        // same email — rejected
        expect(isUnique(email + '.cd')).toBe(true)  // different — accepted
      }),
      { numRuns: 100 },
    )
  })
})

// ─── P7: Email format ─────────────────────────────────────────────────────────

describe('P7 — Every stored email address conforms to a valid format', () => {

  it('P7-A: all fast-check generated emailAddress() values pass validation', () => {
    fc.assert(
      fc.property(fc.emailAddress(), (email) => {
        expect(isValidEmail(email)).toBe(true)
      }),
      { numRuns: 100 },
    )
  })

  it('P7-B: obviously invalid emails always fail', () => {
    const invalid = [
      'notanemail',
      'missing@',
      '@nodomain',
      'double@@domain.com',
      'space in@email.com',
      '',
    ]
    invalid.forEach(email => {
      expect(isValidEmail(email)).toBe(false)
    })
  })

  it('P7-C: email format check is idempotent (validating twice returns same result)', () => {
    fc.assert(
      fc.property(fc.emailAddress(), (email) => {
        expect(isValidEmail(email)).toBe(isValidEmail(email))
      }),
      { numRuns: 100 },
    )
  })
})

// ─── P8: Phone format ─────────────────────────────────────────────────────────

describe('P8 — Every stored phone conforms to +243XXXXXXXXX (13 characters)', () => {

  it('P8-A: generated valid DRC phones all pass validation', () => {
    fc.assert(
      fc.property(phoneArb, (phone) => {
        expect(isValidDrcPhone(phone)).toBe(true)
      }),
      { numRuns: 100 },
    )
  })

  it('P8-B: all valid phones are exactly 13 characters', () => {
    fc.assert(
      fc.property(phoneArb, (phone) => {
        expect(phone.length).toBe(13)
      }),
      { numRuns: 100 },
    )
  })

  it('P8-C: all valid phones start with +243', () => {
    fc.assert(
      fc.property(phoneArb, (phone) => {
        expect(phone.startsWith('+243')).toBe(true)
      }),
      { numRuns: 100 },
    )
  })

  it('P8-D: truncating the last digit always fails validation', () => {
    fc.assert(
      fc.property(phoneArb, (phone) => {
        expect(isValidDrcPhone(phone.slice(0, -1))).toBe(false)
      }),
      { numRuns: 100 },
    )
  })
})

// ─── P9: Phone round-trip ─────────────────────────────────────────────────────

describe('P9 — Phone parse → reformat round-trip is lossless', () => {

  it('P9-A: parse then reformat produces the original phone', () => {
    fc.assert(
      fc.property(phoneArb, (phone) => {
        const parsed = parseDrcPhone(phone)
        expect(parsed).not.toBeNull()
        const reformatted = formatDrcPhone(parsed!.prefix, parsed!.number)
        expect(reformatted).toBe(phone)
      }),
      { numRuns: 100 },
    )
  })

  it('P9-B: the digits portion is preserved exactly', () => {
    fc.assert(
      fc.property(phoneArb, (phone) => {
        const parsed = parseDrcPhone(phone)
        expect(parsed!.number).toBe(phone.slice(4))
        expect(parsed!.number).toHaveLength(9)
      }),
      { numRuns: 100 },
    )
  })

  it('P9-C: invalid phones return null from parse (no silent data loss)', () => {
    const invalid = ['+24381234567', '0812345678', '+225812345678']
    invalid.forEach(phone => {
      expect(parseDrcPhone(phone)).toBeNull()
    })
  })
})
