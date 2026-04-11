/**
 * Prohibited Keywords Detection Tests
 */

import {
  containsProhibitedKeyword,
  getProhibitedKeyword,
  validateNoProhibitedKeywords,
} from '../keywords'

describe('containsProhibitedKeyword', () => {
  it('should detect "OTHM" (uppercase)', () => {
    expect(containsProhibitedKeyword('I want to study OTHM')).toBe(true)
  })

  it('should detect "othm" (lowercase)', () => {
    expect(containsProhibitedKeyword('i want to study othm')).toBe(true)
  })

  it('should detect "Othm" (mixed case)', () => {
    expect(containsProhibitedKeyword('I want to study Othm')).toBe(true)
  })

  it('should detect "O.T.H.M"', () => {
    expect(containsProhibitedKeyword('I want to study O.T.H.M')).toBe(true)
  })

  it('should detect "O T H M"', () => {
    expect(containsProhibitedKeyword('I want to study O T H M')).toBe(true)
  })

  it('should detect OTHM in middle of text', () => {
    expect(containsProhibitedKeyword('The OTHM diploma is great')).toBe(true)
  })

  it('should not detect in valid text', () => {
    expect(containsProhibitedKeyword('UK Level 3 Foundation Diploma')).toBe(false)
  })

  it('should not detect in empty string', () => {
    expect(containsProhibitedKeyword('')).toBe(false)
  })

  it('should not detect similar words', () => {
    expect(containsProhibitedKeyword('other things')).toBe(false)
    expect(containsProhibitedKeyword('mother')).toBe(false)
  })
})

describe('getProhibitedKeyword', () => {
  it('should return the prohibited keyword found', () => {
    expect(getProhibitedKeyword('I want OTHM')).toBe('OTHM')
  })

  it('should return null if no keyword found', () => {
    expect(getProhibitedKeyword('UK Level 3 Foundation Diploma')).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(getProhibitedKeyword('')).toBeNull()
  })
})

describe('validateNoProhibitedKeywords', () => {
  it('should not throw for valid text', () => {
    expect(() => validateNoProhibitedKeywords('UK Level 3 Foundation Diploma')).not.toThrow()
  })

  it('should throw for text with OTHM', () => {
    expect(() => validateNoProhibitedKeywords('I want OTHM')).toThrow(
      'Le mot "OTHM" n\'est pas autorisé'
    )
  })

  it('should throw for text with O.T.H.M', () => {
    expect(() => validateNoProhibitedKeywords('I want O.T.H.M')).toThrow(
      'n\'est pas autorisé'
    )
  })

  it('should include replacement suggestion', () => {
    expect(() => validateNoProhibitedKeywords('OTHM diploma')).toThrow(
      'UK Level 3 Foundation Diploma'
    )
  })
})
