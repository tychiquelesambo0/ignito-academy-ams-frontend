/**
 * Coverage tests for src/lib/validations/auth.ts (Zod registration schema)
 */
import { describe, it, expect } from 'vitest'
import { registrationSchema } from '@/lib/validations/auth'

const VALID = {
  prenom:          'Jean',
  nom:             'Dupont',
  email:           'jean.dupont@example.com',
  phone_number:    '+243812345678',
  date_naissance:  '2000-03-15',
  password:        'SecurePass123',
  confirmPassword: 'SecurePass123',
}

describe('registrationSchema — valid inputs', () => {
  it('accepts a fully valid registration payload', () => {
    const result = registrationSchema.safeParse(VALID)
    expect(result.success).toBe(true)
  })

  it('normalises email to lowercase', () => {
    const result = registrationSchema.safeParse({ ...VALID, email: 'USER@EXAMPLE.COM' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('user@example.com')
    }
  })
})

describe('registrationSchema — prenom / nom', () => {
  it('rejects prenom shorter than 2 characters', () => {
    const r = registrationSchema.safeParse({ ...VALID, prenom: 'A' })
    expect(r.success).toBe(false)
  })

  it('rejects prenom longer than 100 characters', () => {
    const r = registrationSchema.safeParse({ ...VALID, prenom: 'A'.repeat(101) })
    expect(r.success).toBe(false)
  })

  it('rejects prenom with digits', () => {
    const r = registrationSchema.safeParse({ ...VALID, prenom: 'Jean1' })
    expect(r.success).toBe(false)
  })

  it('accepts prenom with accented characters', () => {
    const r = registrationSchema.safeParse({ ...VALID, prenom: 'Élise' })
    expect(r.success).toBe(true)
  })

  it('rejects nom shorter than 2 characters', () => {
    const r = registrationSchema.safeParse({ ...VALID, nom: 'D' })
    expect(r.success).toBe(false)
  })

  it('rejects nom longer than 100 characters', () => {
    const r = registrationSchema.safeParse({ ...VALID, nom: 'D'.repeat(101) })
    expect(r.success).toBe(false)
  })
})

describe('registrationSchema — email', () => {
  it('rejects an invalid email', () => {
    const r = registrationSchema.safeParse({ ...VALID, email: 'notanemail' })
    expect(r.success).toBe(false)
  })

  it('rejects an email without domain TLD', () => {
    const r = registrationSchema.safeParse({ ...VALID, email: 'user@localhost' })
    expect(r.success).toBe(false)
  })
})

describe('registrationSchema — phone_number', () => {
  it('accepts a valid +243XXXXXXXXX number', () => {
    const r = registrationSchema.safeParse({ ...VALID, phone_number: '+243990000001' })
    expect(r.success).toBe(true)
  })

  it('rejects local format without country code', () => {
    const r = registrationSchema.safeParse({ ...VALID, phone_number: '0812345678' })
    expect(r.success).toBe(false)
  })

  it('rejects wrong country code', () => {
    const r = registrationSchema.safeParse({ ...VALID, phone_number: '+33612345678' })
    expect(r.success).toBe(false)
  })

  it('rejects too-short DRC number', () => {
    const r = registrationSchema.safeParse({ ...VALID, phone_number: '+24381234' })
    expect(r.success).toBe(false)
  })
})

describe('registrationSchema — date_naissance', () => {
  it('rejects an incorrectly formatted date', () => {
    const r = registrationSchema.safeParse({ ...VALID, date_naissance: '15/03/2000' })
    expect(r.success).toBe(false)
  })

  it('rejects a date that makes the applicant younger than 16', () => {
    const today = new Date()
    const tooYoung = `${today.getFullYear() - 10}-01-01`
    const r = registrationSchema.safeParse({ ...VALID, date_naissance: tooYoung })
    expect(r.success).toBe(false)
  })

  it('accepts a date that makes the applicant 17 years old', () => {
    const today = new Date()
    const seventeen = `${today.getFullYear() - 17}-06-15`
    const r = registrationSchema.safeParse({ ...VALID, date_naissance: seventeen })
    expect(r.success).toBe(true)
  })
})

describe('registrationSchema — password', () => {
  it('rejects a password shorter than 6 characters', () => {
    const r = registrationSchema.safeParse({ ...VALID, password: '12345', confirmPassword: '12345' })
    expect(r.success).toBe(false)
  })

  it('accepts a password of exactly 6 characters', () => {
    const r = registrationSchema.safeParse({ ...VALID, password: '123456', confirmPassword: '123456' })
    expect(r.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const r = registrationSchema.safeParse({ ...VALID, password: 'Pass123', confirmPassword: 'Different123' })
    expect(r.success).toBe(false)
    // ZodError exposes issues (errors is an alias; use issues for maximum compatibility)
    if (!r.success) {
      expect(r.error.issues.length).toBeGreaterThan(0)
    }
  })
})
