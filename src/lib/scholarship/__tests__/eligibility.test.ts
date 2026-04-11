/**
 * Scholarship Eligibility Tests
 */

import {
  calculateAge,
  calculateScholarshipEligibility,
  hasReachedScholarshipLimit,
  formatEligibilityReasons,
  MAX_SCHOLARSHIPS_PER_YEAR,
  MIN_GRADE_AVERAGE,
  MAX_AGE_ON_SEPTEMBER_1ST,
  MIN_GRADUATION_YEAR,
} from '../eligibility'

describe('calculateAge', () => {
  it('should calculate age correctly on September 1st', () => {
    // Born Jan 1, 2005 -> Age on Sept 1, 2026 = 21
    const dob1 = new Date(2005, 0, 1)
    expect(calculateAge(dob1, 2026)).toBe(21)
    
    // Born Sept 1, 2005 -> Age on Sept 1, 2026 = 21
    const dob2 = new Date(2005, 8, 1)
    expect(calculateAge(dob2, 2026)).toBe(21)
    
    // Born Sept 2, 2005 -> Age on Sept 1, 2026 = 20 (birthday not yet)
    const dob3 = new Date(2005, 8, 2)
    expect(calculateAge(dob3, 2026)).toBe(20)
    
    // Born Dec 31, 2005 -> Age on Sept 1, 2026 = 20 (birthday not yet)
    const dob4 = new Date(2005, 11, 31)
    expect(calculateAge(dob4, 2026)).toBe(20)
  })

  it('should handle leap years correctly', () => {
    // Born Feb 29, 2004 (leap year) -> Age on Sept 1, 2026 = 22
    const dob = new Date(2004, 1, 29)
    expect(calculateAge(dob, 2026)).toBe(22)
  })

  it('should calculate age for exactly 19 years old', () => {
    // Born Sept 1, 2007 -> Age on Sept 1, 2026 = 19 (eligible)
    const dob = new Date(2007, 8, 1)
    expect(calculateAge(dob, 2026)).toBe(19)
  })

  it('should calculate age for exactly 20 years old', () => {
    // Born Sept 1, 2006 -> Age on Sept 1, 2026 = 20 (NOT eligible)
    const dob = new Date(2006, 8, 1)
    expect(calculateAge(dob, 2026)).toBe(20)
  })
})

describe('calculateScholarshipEligibility', () => {
  const baseParams = {
    grade10Average: 80,
    grade11Average: 80,
    grade12Average: 80,
    exetatPercentage: 80,
    dateOfBirth: new Date(2007, 0, 1), // Age 19 on Sept 1, 2026
    graduationYear: 2024,
    intakeYear: 2026,
  }

  it('should return eligible for valid applicant', () => {
    const result = calculateScholarshipEligibility(baseParams)
    
    expect(result.isEligible).toBe(true)
    expect(result.reasons).toHaveLength(0)
    expect(result.averageGrade).toBe(80)
    expect(result.ageOnSeptember1st).toBe(19)
  })

  it('should reject if any grade is missing', () => {
    const result = calculateScholarshipEligibility({
      ...baseParams,
      grade10Average: null,
    })
    
    expect(result.isEligible).toBe(false)
    expect(result.reasons).toContain('Toutes les notes (10e, 11e, 12e année, et EXETAT) sont requises')
  })

  it('should reject if average grade < 70%', () => {
    const result = calculateScholarshipEligibility({
      ...baseParams,
      grade10Average: 60,
      grade11Average: 60,
      grade12Average: 60,
      exetatPercentage: 60,
    })
    
    expect(result.isEligible).toBe(false)
    expect(result.reasons.some(r => r.includes('Moyenne académique insuffisante'))).toBe(true)
    expect(result.averageGrade).toBe(60)
  })

  it('should reject if any individual grade < 70%', () => {
    const result = calculateScholarshipEligibility({
      ...baseParams,
      grade10Average: 65, // Below 70%
      grade11Average: 80,
      grade12Average: 80,
      exetatPercentage: 80,
    })
    
    expect(result.isEligible).toBe(false)
    expect(result.reasons.some(r => r.includes('10e année insuffisante'))).toBe(true)
  })

  it('should accept exactly 70% average', () => {
    const result = calculateScholarshipEligibility({
      ...baseParams,
      grade10Average: 70,
      grade11Average: 70,
      grade12Average: 70,
      exetatPercentage: 70,
    })
    
    expect(result.isEligible).toBe(true)
    expect(result.averageGrade).toBe(70)
  })

  it('should reject if age > 19 on September 1st', () => {
    const result = calculateScholarshipEligibility({
      ...baseParams,
      dateOfBirth: new Date(2006, 0, 1), // Age 20 on Sept 1, 2026
    })
    
    expect(result.isEligible).toBe(false)
    expect(result.reasons.some(r => r.includes('Âge trop élevé'))).toBe(true)
    expect(result.ageOnSeptember1st).toBe(20)
  })

  it('should accept exactly 19 years old on September 1st', () => {
    const result = calculateScholarshipEligibility({
      ...baseParams,
      dateOfBirth: new Date(2007, 8, 1), // Exactly 19 on Sept 1, 2026
    })
    
    expect(result.isEligible).toBe(true)
    expect(result.ageOnSeptember1st).toBe(19)
  })

  it('should reject if graduation year < 2024', () => {
    const result = calculateScholarshipEligibility({
      ...baseParams,
      graduationYear: 2023,
    })
    
    expect(result.isEligible).toBe(false)
    expect(result.reasons.some(r => r.includes('Année de graduation invalide'))).toBe(true)
  })

  it('should accept graduation year = 2024', () => {
    const result = calculateScholarshipEligibility({
      ...baseParams,
      graduationYear: 2024,
    })
    
    expect(result.isEligible).toBe(true)
  })

  it('should accept graduation year > 2024', () => {
    const result = calculateScholarshipEligibility({
      ...baseParams,
      graduationYear: 2025,
    })
    
    expect(result.isEligible).toBe(true)
  })

  it('should return multiple reasons if multiple criteria fail', () => {
    const result = calculateScholarshipEligibility({
      ...baseParams,
      grade10Average: 60,
      grade11Average: 60,
      grade12Average: 60,
      exetatPercentage: 60,
      dateOfBirth: new Date(2005, 0, 1), // Age 21
      graduationYear: 2023,
    })
    
    expect(result.isEligible).toBe(false)
    expect(result.reasons.length).toBeGreaterThan(1)
    expect(result.reasons.some(r => r.includes('Moyenne académique'))).toBe(true)
    expect(result.reasons.some(r => r.includes('Âge trop élevé'))).toBe(true)
    expect(result.reasons.some(r => r.includes('Année de graduation'))).toBe(true)
  })

  it('should handle perfect scores', () => {
    const result = calculateScholarshipEligibility({
      ...baseParams,
      grade10Average: 100,
      grade11Average: 100,
      grade12Average: 100,
      exetatPercentage: 100,
    })
    
    expect(result.isEligible).toBe(true)
    expect(result.averageGrade).toBe(100)
  })
})

describe('hasReachedScholarshipLimit', () => {
  it('should return false when under limit', () => {
    const result = hasReachedScholarshipLimit(10)
    
    expect(result.limitReached).toBe(false)
    expect(result.currentCount).toBe(10)
    expect(result.maxScholarships).toBe(MAX_SCHOLARSHIPS_PER_YEAR)
  })

  it('should return true when at limit', () => {
    const result = hasReachedScholarshipLimit(20)
    
    expect(result.limitReached).toBe(true)
    expect(result.currentCount).toBe(20)
  })

  it('should return true when over limit', () => {
    const result = hasReachedScholarshipLimit(21)
    
    expect(result.limitReached).toBe(true)
    expect(result.currentCount).toBe(21)
  })

  it('should return false when at 0', () => {
    const result = hasReachedScholarshipLimit(0)
    
    expect(result.limitReached).toBe(false)
    expect(result.currentCount).toBe(0)
  })

  it('should return false when at 19 (one below limit)', () => {
    const result = hasReachedScholarshipLimit(19)
    
    expect(result.limitReached).toBe(false)
    expect(result.currentCount).toBe(19)
  })
})

describe('formatEligibilityReasons', () => {
  it('should format eligible status', () => {
    const result = formatEligibilityReasons([])
    expect(result).toBe('Éligible pour une bourse')
  })

  it('should format single reason', () => {
    const result = formatEligibilityReasons(['Âge trop élevé'])
    expect(result).toBe('Non éligible: Âge trop élevé')
  })

  it('should format multiple reasons', () => {
    const reasons = [
      'Moyenne académique insuffisante',
      'Âge trop élevé',
      'Année de graduation invalide',
    ]
    const result = formatEligibilityReasons(reasons)
    
    expect(result).toContain('Non éligible:')
    expect(result).toContain('1. Moyenne académique insuffisante')
    expect(result).toContain('2. Âge trop élevé')
    expect(result).toContain('3. Année de graduation invalide')
  })
})

describe('Constants', () => {
  it('should have correct constant values', () => {
    expect(MAX_SCHOLARSHIPS_PER_YEAR).toBe(20)
    expect(MIN_GRADE_AVERAGE).toBe(70)
    expect(MAX_AGE_ON_SEPTEMBER_1ST).toBe(19)
    expect(MIN_GRADUATION_YEAR).toBe(2024)
  })
})
