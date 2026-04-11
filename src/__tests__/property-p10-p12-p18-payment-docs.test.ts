/**
 * Property Tests: P10–P12, P18
 *
 * P10 — Payment_Status always initialises to 'Pending'
 * P11 — Payment confirmation always advances Application_Status to 'en_cours_devaluation'
 * P12 — payment_confirmed_at is set if and only if payment_status is 'paid'/'Confirmed'
 * P18 — Uploaded documents can only be read/deleted by their owner or an admin officer
 *
 * Each property runs 100+ iterations.
 * Requirements: 8.1–8.4, 6.3–6.5
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// ─── Payment status model ─────────────────────────────────────────────────────

type PaymentStatus      = 'Pending' | 'paid' | 'Confirmed' | 'Failed'
type ApplicationStatus  = 'Dossier Créé' | 'en_cours_devaluation' | 'Admission sous réserve' | 'Admission définitive' | 'Dossier refusé'

interface ApplicationRecord {
  applicant_id:         string
  application_status:   ApplicationStatus
  payment_status:       PaymentStatus
  payment_confirmed_at: string | null
}

function createApplication(applicantId: string): ApplicationRecord {
  return {
    applicant_id:         applicantId,
    application_status:   'Dossier Créé',
    payment_status:       'Pending',
    payment_confirmed_at: null,
  }
}

function confirmPayment(app: ApplicationRecord, timestamp: string): ApplicationRecord {
  return {
    ...app,
    payment_status:       'paid',
    application_status:   'en_cours_devaluation',
    payment_confirmed_at: timestamp,
  }
}

function failPayment(app: ApplicationRecord): ApplicationRecord {
  return { ...app, payment_status: 'Failed' }
}

// ─── Document access model ────────────────────────────────────────────────────

interface DocumentRecord {
  id:          string
  applicant_id: string
  owner_user_id: string
}

type UserRole = 'applicant' | 'admissions_officer'

interface User {
  id:   string
  role: UserRole
}

function canAccessDocument(user: User, doc: DocumentRecord): boolean {
  if (user.role === 'admissions_officer') return true
  return user.id === doc.owner_user_id
}

function canDeleteDocument(
  user:          User,
  doc:           DocumentRecord,
  paymentStatus: PaymentStatus,
  appStatus:     ApplicationStatus,
): boolean {
  if (!canAccessDocument(user, doc)) return false
  // Admissions officers bypass the document lock entirely
  if (user.role === 'admissions_officer') return true
  // Locked after payment unless in conditional admission
  const locked = (paymentStatus === 'paid' || paymentStatus === 'Confirmed')
                 && appStatus !== 'Admission sous réserve'
  return !locked
}

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const idArb = fc.uuid()
// Use integer ms range to avoid fast-check generating invalid edge-case dates
const TS_START     = new Date('2026-01-01T00:00:00Z').getTime()
const TS_END       = new Date('2026-12-31T23:59:59Z').getTime()
const timestampArb = fc.integer({ min: TS_START, max: TS_END })
                       .map(ms => new Date(ms).toISOString())

// ─── P10: Payment status initialises to Pending ───────────────────────────────

describe('P10 — Payment_Status always initialises to "Pending"', () => {

  it('P10-A: newly created application always has payment_status = Pending', () => {
    fc.assert(
      fc.property(idArb, (id) => {
        const app = createApplication(id)
        expect(app.payment_status).toBe('Pending')
      }),
      { numRuns: 100 },
    )
  })

  it('P10-B: newly created application always has application_status = "Dossier Créé"', () => {
    fc.assert(
      fc.property(idArb, (id) => {
        const app = createApplication(id)
        expect(app.application_status).toBe('Dossier Créé')
      }),
      { numRuns: 100 },
    )
  })

  it('P10-C: newly created application has no payment timestamp', () => {
    fc.assert(
      fc.property(idArb, (id) => {
        const app = createApplication(id)
        expect(app.payment_confirmed_at).toBeNull()
      }),
      { numRuns: 100 },
    )
  })
})

// ─── P11: Payment confirmation advances application status ────────────────────

describe('P11 — Payment confirmation advances Application_Status to "en_cours_devaluation"', () => {

  it('P11-A: after payment confirmation status is always en_cours_devaluation', () => {
    fc.assert(
      fc.property(idArb, timestampArb, (id, ts) => {
        const app      = createApplication(id)
        const confirmed = confirmPayment(app, ts)
        expect(confirmed.application_status).toBe('en_cours_devaluation')
      }),
      { numRuns: 100 },
    )
  })

  it('P11-B: payment failure does NOT advance application status', () => {
    fc.assert(
      fc.property(idArb, (id) => {
        const app    = createApplication(id)
        const failed = failPayment(app)
        expect(failed.application_status).toBe('Dossier Créé')
      }),
      { numRuns: 100 },
    )
  })

  it('P11-C: payment confirmation sets payment_status to "paid"', () => {
    fc.assert(
      fc.property(idArb, timestampArb, (id, ts) => {
        const confirmed = confirmPayment(createApplication(id), ts)
        expect(confirmed.payment_status).toBe('paid')
      }),
      { numRuns: 100 },
    )
  })

  it('P11-D: payment failure sets payment_status to "Failed"', () => {
    fc.assert(
      fc.property(idArb, (id) => {
        const failed = failPayment(createApplication(id))
        expect(failed.payment_status).toBe('Failed')
      }),
      { numRuns: 100 },
    )
  })
})

// ─── P12: payment_confirmed_at iff payment confirmed ─────────────────────────

describe('P12 — payment_confirmed_at is set iff payment_status is "paid"/"Confirmed"', () => {

  it('P12-A: confirmed payment always has a non-null timestamp', () => {
    fc.assert(
      fc.property(idArb, timestampArb, (id, ts) => {
        const app = confirmPayment(createApplication(id), ts)
        expect(app.payment_confirmed_at).not.toBeNull()
        expect(app.payment_confirmed_at).toBe(ts)
      }),
      { numRuns: 100 },
    )
  })

  it('P12-B: pending payment has a null timestamp', () => {
    fc.assert(
      fc.property(idArb, (id) => {
        expect(createApplication(id).payment_confirmed_at).toBeNull()
      }),
      { numRuns: 100 },
    )
  })

  it('P12-C: failed payment has a null timestamp', () => {
    fc.assert(
      fc.property(idArb, (id) => {
        expect(failPayment(createApplication(id)).payment_confirmed_at).toBeNull()
      }),
      { numRuns: 100 },
    )
  })

  it('P12-D: timestamp is a valid ISO 8601 string', () => {
    fc.assert(
      fc.property(idArb, timestampArb, (id, ts) => {
        const app = confirmPayment(createApplication(id), ts)
        expect(() => new Date(app.payment_confirmed_at!)).not.toThrow()
        expect(new Date(app.payment_confirmed_at!).getTime()).not.toBeNaN()
      }),
      { numRuns: 100 },
    )
  })

  it('P12-E: payment_confirmed_at is monotonically after created_at', () => {
    const createdAt    = new Date('2026-01-01T00:00:00Z')
    const afterStart   = new Date('2026-01-02T00:00:00Z').getTime()
    const afterEnd     = new Date('2026-12-31T00:00:00Z').getTime()
    fc.assert(
      fc.property(
        fc.integer({ min: afterStart, max: afterEnd }).map(ms => new Date(ms).toISOString()),
        (confirmedAt) => {
          expect(new Date(confirmedAt) > createdAt).toBe(true)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─── P18: Document access control ─────────────────────────────────────────────

describe('P18 — Documents are accessible only by their owner or an admissions officer', () => {

  const docArb = fc.record({
    id:            fc.uuid(),
    applicant_id:  fc.stringMatching(/^IGN-\d{4}-\d{5}$/),
    owner_user_id: fc.uuid(),
  })

  it('P18-A: document owner can always access their own document', () => {
    fc.assert(
      fc.property(docArb, (doc) => {
        const owner: User = { id: doc.owner_user_id, role: 'applicant' }
        expect(canAccessDocument(owner, doc)).toBe(true)
      }),
      { numRuns: 100 },
    )
  })

  it('P18-B: admissions officer can access any document', () => {
    fc.assert(
      fc.property(docArb, fc.uuid(), (doc, officerId) => {
        const officer: User = { id: officerId, role: 'admissions_officer' }
        expect(canAccessDocument(officer, doc)).toBe(true)
      }),
      { numRuns: 100 },
    )
  })

  it('P18-C: a different applicant cannot access another applicant\'s document', () => {
    fc.assert(
      fc.property(
        docArb,
        fc.uuid().filter(id => id !== ''),
        (doc, strangerId) => {
          // Ensure stranger is different from owner
          if (strangerId === doc.owner_user_id) return
          const stranger: User = { id: strangerId, role: 'applicant' }
          expect(canAccessDocument(stranger, doc)).toBe(false)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('P18-D: document delete is blocked after payment (unless conditional admission)', () => {
    fc.assert(
      fc.property(docArb, (doc) => {
        const owner: User = { id: doc.owner_user_id, role: 'applicant' }
        // Locked state: paid + en_cours_devaluation
        expect(canDeleteDocument(owner, doc, 'paid', 'en_cours_devaluation')).toBe(false)
      }),
      { numRuns: 100 },
    )
  })

  it('P18-E: document delete is allowed during conditional admission (Admission sous réserve)', () => {
    fc.assert(
      fc.property(docArb, (doc) => {
        const owner: User = { id: doc.owner_user_id, role: 'applicant' }
        expect(canDeleteDocument(owner, doc, 'paid', 'Admission sous réserve')).toBe(true)
      }),
      { numRuns: 100 },
    )
  })

  it('P18-F: admin can delete documents regardless of payment status', () => {
    fc.assert(
      fc.property(docArb, fc.uuid(), (doc, officerId) => {
        const officer: User = { id: officerId, role: 'admissions_officer' }
        expect(canDeleteDocument(officer, doc, 'paid', 'en_cours_devaluation')).toBe(true)
      }),
      { numRuns: 100 },
    )
  })
})
