/**
 * Phone Number Sanitization Tests
 */

import {
  sanitizePhoneNumber,
  isValidDRCPhoneNumber,
  formatPhoneNumberLocal,
} from '../phone'

describe('sanitizePhoneNumber', () => {
  it('should convert 081XXXXXXX to +243XXXXXXXXX', () => {
    expect(sanitizePhoneNumber('0812345678')).toBe('+243812345678')
  })

  it('should convert 0XXXXXXXXX to +243XXXXXXXXX', () => {
    expect(sanitizePhoneNumber('0824401073')).toBe('+243824401073')
  })

  it('should accept 243XXXXXXXXX and add +', () => {
    expect(sanitizePhoneNumber('243824401073')).toBe('+243824401073')
  })

  it('should accept +243XXXXXXXXX as-is', () => {
    expect(sanitizePhoneNumber('+243824401073')).toBe('+243824401073')
  })

  it('should remove spaces', () => {
    expect(sanitizePhoneNumber('0824 401 073')).toBe('+243824401073')
  })

  it('should remove dashes', () => {
    expect(sanitizePhoneNumber('0824-401-073')).toBe('+243824401073')
  })

  it('should remove parentheses', () => {
    expect(sanitizePhoneNumber('(0824) 401-073')).toBe('+243824401073')
  })

  it('should remove dots', () => {
    expect(sanitizePhoneNumber('0824.401.073')).toBe('+243824401073')
  })

  it('should handle mixed formatting', () => {
    expect(sanitizePhoneNumber('+243 (824) 401-073')).toBe('+243824401073')
  })

  it('should throw error for invalid prefix', () => {
    expect(() => sanitizePhoneNumber('1234567890')).toThrow('doit commencer par 0, 243 ou +243')
  })

  it('should throw error for wrong length', () => {
    expect(() => sanitizePhoneNumber('081234567')).toThrow('Longueur attendue: 12 chiffres')
  })

  it('should throw error for non-digits', () => {
    expect(() => sanitizePhoneNumber('08abc12345')).toThrow('Seuls les chiffres sont autorisés')
  })

  it('should throw error for empty string', () => {
    expect(() => sanitizePhoneNumber('')).toThrow()
  })

  it('should handle all DRC mobile prefixes', () => {
    // Vodacom: 81, 82, 83, 84, 85
    expect(sanitizePhoneNumber('0812345678')).toBe('+243812345678')
    expect(sanitizePhoneNumber('0822345678')).toBe('+243822345678')
    expect(sanitizePhoneNumber('0832345678')).toBe('+243832345678')
    expect(sanitizePhoneNumber('0842345678')).toBe('+243842345678')
    expect(sanitizePhoneNumber('0852345678')).toBe('+243852345678')
    
    // Airtel: 97, 98, 99
    expect(sanitizePhoneNumber('0972345678')).toBe('+243972345678')
    expect(sanitizePhoneNumber('0982345678')).toBe('+243982345678')
    expect(sanitizePhoneNumber('0992345678')).toBe('+243992345678')
    
    // Orange: 80, 89, 90
    expect(sanitizePhoneNumber('0802345678')).toBe('+243802345678')
    expect(sanitizePhoneNumber('0892345678')).toBe('+243892345678')
    expect(sanitizePhoneNumber('0902345678')).toBe('+243902345678')
  })
})

describe('isValidDRCPhoneNumber', () => {
  it('should return true for valid numbers', () => {
    expect(isValidDRCPhoneNumber('0824401073')).toBe(true)
    expect(isValidDRCPhoneNumber('+243824401073')).toBe(true)
    expect(isValidDRCPhoneNumber('243824401073')).toBe(true)
  })

  it('should return false for invalid numbers', () => {
    expect(isValidDRCPhoneNumber('1234567890')).toBe(false)
    expect(isValidDRCPhoneNumber('081234567')).toBe(false)
    expect(isValidDRCPhoneNumber('')).toBe(false)
  })
})

describe('formatPhoneNumberLocal', () => {
  it('should convert +243XXXXXXXXX to 0XXXXXXXXX', () => {
    expect(formatPhoneNumberLocal('+243824401073')).toBe('0824401073')
  })

  it('should handle number without +', () => {
    expect(formatPhoneNumberLocal('243824401073')).toBe('0824401073')
  })
})
