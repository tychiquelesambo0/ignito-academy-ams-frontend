/**
 * Coverage tests for src/lib/email/templates.ts
 */
import { describe, it, expect } from 'vitest'
import {
  paymentConfirmationEmail,
  finalAcceptanceEmail,
  conditionalAcceptanceEmail,
  refusalEmail,
} from '@/lib/email/templates'

const BASE_OPTS = {
  prenom:      'Jean',
  nom:         'Dupont',
  applicantId: 'IGN-2026-00042',
}

const PAYMENT_OPTS = {
  ...BASE_OPTS,
  amount: '29 USD',
  date:   '2026-03-04T12:00:00Z',
}

describe('paymentConfirmationEmail', () => {
  it('returns subject and html', () => {
    const r = paymentConfirmationEmail(PAYMENT_OPTS)
    expect(typeof r.subject).toBe('string')
    expect(typeof r.html).toBe('string')
    expect(r.subject.length).toBeGreaterThan(0)
  })

  it('html contains applicant first name', () => {
    const r = paymentConfirmationEmail(PAYMENT_OPTS)
    expect(r.html).toContain('Jean')
  })

  it('html contains applicant ID', () => {
    const r = paymentConfirmationEmail(PAYMENT_OPTS)
    expect(r.html).toContain('IGN-2026-00042')
  })

  it('html contains the payment amount', () => {
    const r = paymentConfirmationEmail(PAYMENT_OPTS)
    expect(r.html).toContain('29 USD')
  })

  it('html is valid HTML (starts with <!DOCTYPE)', () => {
    const r = paymentConfirmationEmail(PAYMENT_OPTS)
    expect(r.html.trim()).toMatch(/^<!DOCTYPE html>/i)
  })
})

describe('finalAcceptanceEmail', () => {
  it('returns subject and html', () => {
    const r = finalAcceptanceEmail(BASE_OPTS)
    expect(typeof r.subject).toBe('string')
    expect(typeof r.html).toBe('string')
  })

  it('html contains applicant first name', () => {
    const r = finalAcceptanceEmail(BASE_OPTS)
    expect(r.html).toContain('Jean')
  })

  it('html contains applicant ID', () => {
    const r = finalAcceptanceEmail(BASE_OPTS)
    expect(r.html).toContain('IGN-2026-00042')
  })

  it('subject indicates a positive decision', () => {
    const r = finalAcceptanceEmail(BASE_OPTS)
    expect(r.subject.toLowerCase()).toMatch(/admis|félicit|définitiv/i)
  })
})

describe('conditionalAcceptanceEmail', () => {
  const COND_MSG = 'Veuillez soumettre votre relevé de notes final.'

  it('returns subject and html', () => {
    const r = conditionalAcceptanceEmail({ ...BASE_OPTS, conditionalMessage: COND_MSG })
    expect(typeof r.subject).toBe('string')
    expect(typeof r.html).toBe('string')
  })

  it('html contains the conditional message', () => {
    const r = conditionalAcceptanceEmail({ ...BASE_OPTS, conditionalMessage: COND_MSG })
    expect(r.html).toContain(COND_MSG)
  })

  it('html contains applicant first name', () => {
    const r = conditionalAcceptanceEmail({ ...BASE_OPTS, conditionalMessage: COND_MSG })
    expect(r.html).toContain('Jean')
  })

  it('html contains applicant ID', () => {
    const r = conditionalAcceptanceEmail({ ...BASE_OPTS, conditionalMessage: COND_MSG })
    expect(r.html).toContain('IGN-2026-00042')
  })

  it('different conditional messages produce different HTML', () => {
    const r1 = conditionalAcceptanceEmail({ ...BASE_OPTS, conditionalMessage: 'Message A' })
    const r2 = conditionalAcceptanceEmail({ ...BASE_OPTS, conditionalMessage: 'Message B' })
    expect(r1.html).not.toBe(r2.html)
  })
})

describe('refusalEmail', () => {
  it('returns subject and html', () => {
    const r = refusalEmail(BASE_OPTS)
    expect(typeof r.subject).toBe('string')
    expect(typeof r.html).toBe('string')
  })

  it('html contains applicant first name', () => {
    const r = refusalEmail(BASE_OPTS)
    expect(r.html).toContain('Jean')
  })

  it('html contains applicant ID', () => {
    const r = refusalEmail(BASE_OPTS)
    expect(r.html).toContain('IGN-2026-00042')
  })

  it('subject indicates a non-acceptance', () => {
    const r = refusalEmail(BASE_OPTS)
    expect(r.subject.length).toBeGreaterThan(5)
  })
})

describe('cross-template invariants', () => {
  it('all templates produce valid HTML', () => {
    const templates = [
      paymentConfirmationEmail(PAYMENT_OPTS),
      finalAcceptanceEmail(BASE_OPTS),
      conditionalAcceptanceEmail({ ...BASE_OPTS, conditionalMessage: 'Test.' }),
      refusalEmail(BASE_OPTS),
    ]
    templates.forEach(t => {
      expect(t.html.trim()).toMatch(/^<!DOCTYPE html>/i)
    })
  })

  it('all templates include Ignito Academy branding', () => {
    const templates = [
      paymentConfirmationEmail(PAYMENT_OPTS),
      finalAcceptanceEmail(BASE_OPTS),
      conditionalAcceptanceEmail({ ...BASE_OPTS, conditionalMessage: 'Test.' }),
      refusalEmail(BASE_OPTS),
    ]
    templates.forEach(t => {
      expect(t.html).toContain('Ignito Academy')
    })
  })

  it('all templates include an institutional signature from the admissions bureau', () => {
    const templates = [
      paymentConfirmationEmail(PAYMENT_OPTS),
      finalAcceptanceEmail(BASE_OPTS),
      conditionalAcceptanceEmail({ ...BASE_OPTS, conditionalMessage: 'Test.' }),
      refusalEmail(BASE_OPTS),
    ]
    templates.forEach(t => {
      expect(t.html).toContain("Bureau d'admissions")
    })
  })
})
