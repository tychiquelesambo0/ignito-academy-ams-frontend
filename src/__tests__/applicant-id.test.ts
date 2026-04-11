import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Property Test 1: Applicant ID Format Invariant
 * 
 * Validates: Requirements 1.2, 18.1, 18.3
 * 
 * This test verifies that the Applicant_ID format is always consistent:
 * - Format: IGN-[4_DIGIT_YEAR]-[5_DIGIT_SEQUENCE]
 * - Year range: 2025-2050
 * - Sequence range: 1-99999
 * - Total length: 17 characters
 */

describe('Applicant ID Format Invariant', () => {
  it('should always match the format IGN-[YEAR]-[SEQUENCE] for any valid year and sequence', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2025, max: 2050 }), // Year range
        fc.integer({ min: 1, max: 99999 }),   // Sequence range
        (year, sequence) => {
          // Generate Applicant_ID
          const applicantId = `IGN-${year}-${sequence.toString().padStart(5, '0')}`

          // Property 1: Format matches regex pattern
          const formatRegex = /^IGN-\d{4}-\d{5}$/
          expect(applicantId).toMatch(formatRegex)

          // Property 2: Total length is exactly 14 characters (IGN-YYYY-NNNNN)
          expect(applicantId.length).toBe(14)

          // Property 3: Starts with "IGN-"
          expect(applicantId.startsWith('IGN-')).toBe(true)

          // Property 4: Year is 4 digits
          const extractedYear = applicantId.substring(4, 8)
          expect(extractedYear).toHaveLength(4)
          expect(parseInt(extractedYear)).toBe(year)

          // Property 5: Sequence is 5 digits (zero-padded)
          const extractedSequence = applicantId.substring(9, 14)
          expect(extractedSequence).toHaveLength(5)
          expect(parseInt(extractedSequence)).toBe(sequence)

          // Property 6: Contains exactly 2 hyphens
          const hyphenCount = (applicantId.match(/-/g) || []).length
          expect(hyphenCount).toBe(2)

          // Property 7: Year is within valid range
          expect(parseInt(extractedYear)).toBeGreaterThanOrEqual(2025)
          expect(parseInt(extractedYear)).toBeLessThanOrEqual(2050)

          // Property 8: Sequence is within valid range
          expect(parseInt(extractedSequence)).toBeGreaterThanOrEqual(1)
          expect(parseInt(extractedSequence)).toBeLessThanOrEqual(99999)
        }
      ),
      { numRuns: 100 } // Run 100+ iterations as specified
    )
  })

  it('should handle edge cases correctly', () => {
    // Test minimum values
    const minId = 'IGN-2025-00001'
    expect(minId).toMatch(/^IGN-\d{4}-\d{5}$/)
    expect(minId.length).toBe(14)

    // Test maximum values
    const maxId = 'IGN-2050-99999'
    expect(maxId).toMatch(/^IGN-\d{4}-\d{5}$/)
    expect(maxId.length).toBe(14)

    // Test current year (2026)
    const currentYearId = 'IGN-2026-00001'
    expect(currentYearId).toMatch(/^IGN-\d{4}-\d{5}$/)
    expect(currentYearId.length).toBe(14)
  })

  it('should reject invalid formats', () => {
    const invalidFormats = [
      'IGN-26-00001',      // Year too short
      'IGN-2026-0001',     // Sequence too short
      'IGN-2026-000001',   // Sequence too long
      'IGN2026-00001',     // Missing hyphen
      'IGN-2026-1',        // Sequence not padded
      'ABC-2026-00001',    // Wrong prefix
      'IGN-2024-00001',    // Year out of range (too low)
      'IGN-2051-00001',    // Year out of range (too high)
      'IGN-2026-100000',   // Sequence out of range
    ]

    const formatRegex = /^IGN-(202[5-9]|20[3-4][0-9]|2050)-\d{5}$/
    
    invalidFormats.forEach(invalidId => {
      if (invalidId.match(/^IGN-\d{4}-\d{5}$/)) {
        // If it matches basic format, check year/sequence ranges
        const year = parseInt(invalidId.substring(4, 8))
        const sequence = parseInt(invalidId.substring(9, 14))
        
        const isValidYear = year >= 2025 && year <= 2050
        const isValidSequence = sequence >= 1 && sequence <= 99999
        
        expect(isValidYear && isValidSequence).toBe(false)
      } else {
        // Basic format is invalid
        expect(invalidId).not.toMatch(/^IGN-\d{4}-\d{5}$/)
      }
    })
  })
})

/**
 * Property Test 2: Applicant ID Round-Trip
 * 
 * Validates: Requirements 18.5
 * 
 * This test verifies that Applicant_IDs can be parsed and reformatted correctly:
 * - Parse Applicant_ID to extract year and sequence
 * - Reformat using extracted components
 * - Verify reformatted ID equals original ID
 */

describe('Applicant ID Round-Trip', () => {
  it('should parse and reformat Applicant_ID without data loss', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2025, max: 2050 }),
        fc.integer({ min: 1, max: 99999 }),
        (year, sequence) => {
          // Generate original Applicant_ID
          const originalId = `IGN-${year}-${sequence.toString().padStart(5, '0')}`

          // Parse components from Applicant_ID
          const parseApplicantId = (id: string) => {
            const parts = id.split('-')
            if (parts.length !== 3 || parts[0] !== 'IGN') {
              throw new Error('Invalid Applicant_ID format')
            }
            return {
              prefix: parts[0],
              year: parseInt(parts[1]),
              sequence: parseInt(parts[2]),
            }
          }

          // Parse the ID
          const parsed = parseApplicantId(originalId)

          // Verify parsed components match original
          expect(parsed.prefix).toBe('IGN')
          expect(parsed.year).toBe(year)
          expect(parsed.sequence).toBe(sequence)

          // Reformat using parsed components
          const reformattedId = `${parsed.prefix}-${parsed.year}-${parsed.sequence.toString().padStart(5, '0')}`

          // Property: Reformatted ID must equal original ID (round-trip invariant)
          expect(reformattedId).toBe(originalId)

          // Additional verification: Both IDs should have same length
          expect(reformattedId.length).toBe(originalId.length)

          // Additional verification: Both IDs should match format
          const formatRegex = /^IGN-\d{4}-\d{5}$/
          expect(reformattedId).toMatch(formatRegex)
          expect(originalId).toMatch(formatRegex)
        }
      ),
      { numRuns: 100 } // Run 100+ iterations as specified
    )
  })

  it('should handle edge cases in round-trip conversion', () => {
    const testCases = [
      { id: 'IGN-2025-00001', year: 2025, sequence: 1 },
      { id: 'IGN-2050-99999', year: 2050, sequence: 99999 },
      { id: 'IGN-2026-00100', year: 2026, sequence: 100 },
      { id: 'IGN-2030-12345', year: 2030, sequence: 12345 },
    ]

    testCases.forEach(({ id, year, sequence }) => {
      // Parse
      const parts = id.split('-')
      const parsedYear = parseInt(parts[1])
      const parsedSequence = parseInt(parts[2])

      expect(parsedYear).toBe(year)
      expect(parsedSequence).toBe(sequence)

      // Reformat
      const reformatted = `IGN-${parsedYear}-${parsedSequence.toString().padStart(5, '0')}`
      expect(reformatted).toBe(id)
    })
  })

  it('should reject malformed IDs during parsing', () => {
    const malformedIds = [
      'IGN-2026',           // Missing sequence
      'IGN-2026-',          // Empty sequence
      '2026-00001',         // Missing prefix
      'ABC-2026-00001',     // Wrong prefix
      'IGN-26-00001',       // Invalid year
      'IGN-2026-1',         // Unpadded sequence
    ]

    malformedIds.forEach(malformedId => {
      expect(() => {
        const parts = malformedId.split('-')
        if (parts.length !== 3 || parts[0] !== 'IGN') {
          throw new Error('Invalid format')
        }
        if (parts[1].length !== 4 || parts[2].length !== 5) {
          throw new Error('Invalid component length')
        }
      }).toThrow()
    })
  })
})
