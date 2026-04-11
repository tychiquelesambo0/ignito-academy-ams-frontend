/**
 * Coverage tests for src/lib/validations/email.ts
 */
import { describe, it, expect } from 'vitest'
import { isValidEmail, validateEmail, normaliseEmail } from '@/lib/validations/email'

describe('isValidEmail', () => {
  it('accepts well-formed emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('firstname.lastname@university.ac.cd')).toBe(true)
    expect(isValidEmail('USER@DOMAIN.CD')).toBe(true)
  })

  it('rejects missing @', () => {
    expect(isValidEmail('nodomain')).toBe(false)
  })

  it('rejects double @', () => {
    expect(isValidEmail('a@@b.com')).toBe(false)
  })

  it('rejects spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false)
  })

  it('rejects missing local part', () => {
    expect(isValidEmail('@domain.com')).toBe(false)
  })

  it('rejects missing domain', () => {
    expect(isValidEmail('user@')).toBe(false)
  })

  it('rejects single-label domain', () => {
    expect(isValidEmail('user@localhost')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail(null as unknown as string)).toBe(false)
  })
})

describe('validateEmail', () => {
  it('returns valid:true for a good email', () => {
    const r = validateEmail('user@ignito.cd')
    expect(r.valid).toBe(true)
    expect(r.error).toBeUndefined()
  })

  it('returns French error for missing @', () => {
    const r = validateEmail('notanemail')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/@/)
  })

  it('returns French error for double @', () => {
    const r = validateEmail('a@@b.com')
    expect(r.valid).toBe(false)
    expect(r.error).toBeTruthy()
  })

  it('returns French error for spaces', () => {
    const r = validateEmail('a b@c.com')
    expect(r.valid).toBe(false)
    expect(r.error).toBeTruthy()
  })

  it('returns French error for empty input', () => {
    const r = validateEmail('')
    expect(r.valid).toBe(false)
    expect(r.error).toBeTruthy()
  })

  it('returns French error for no local part', () => {
    const r = validateEmail('@domain.com')
    expect(r.valid).toBe(false)
    expect(r.error).toBeTruthy()
  })

  it('returns French error for invalid domain', () => {
    const r = validateEmail('user@localhost')
    expect(r.valid).toBe(false)
    expect(r.error).toBeTruthy()
  })

  it('returns French error for short TLD', () => {
    const r = validateEmail('user@domain.c')
    expect(r.valid).toBe(false)
    expect(r.error).toBeTruthy()
  })
})

describe('normaliseEmail', () => {
  it('lowercases and trims', () => {
    expect(normaliseEmail('  USER@DOMAIN.COM  ')).toBe('user@domain.com')
  })

  it('leaves valid lowercase unchanged', () => {
    expect(normaliseEmail('user@example.cd')).toBe('user@example.cd')
  })
})
