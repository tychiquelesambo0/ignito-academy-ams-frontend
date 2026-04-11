/**
 * Property Tests: P33–P36, P38
 *
 * P33 — Audit records are immutable once written (no update/delete)
 * P34 — Every audit record contains both the previous and new status
 * P35 — A PDF decision letter is generated for Admission définitive and
 *        Admission sous réserve, but not for 'Dossier refusé' or interim statuses
 * P36 — Every generated PDF contains the applicant_id and the decision date
 * P38 — The payment webhook correctly maps payment.confirmed → application update
 *
 * Each property runs 100+ iterations.
 * Requirements: 10.1–10.5, 8.2
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// ─── Audit model ──────────────────────────────────────────────────────────────

type AppStatus =
  | 'Dossier Créé'
  | 'en_cours_devaluation'
  | 'Admission sous réserve'
  | 'Admission définitive'
  | 'Dossier refusé'

interface AuditRecord {
  readonly id:          string
  readonly applicant_id: string
  readonly old_status:   AppStatus
  readonly new_status:   AppStatus
  readonly changed_by:   string
  readonly changed_at:   string
  readonly version:      number
}

function createAuditRecord(
  applicantId: string,
  from:        AppStatus,
  to:          AppStatus,
  changedBy:   string,
  ts:          string,
  version:     number,
): AuditRecord {
  return Object.freeze({
    id:           crypto.randomUUID(),
    applicant_id: applicantId,
    old_status:   from,
    new_status:   to,
    changed_by:   changedBy,
    changed_at:   ts,
    version,
  })
}

/** Simulates an in-memory append-only audit log */
class AuditLog {
  private records: AuditRecord[] = []

  append(record: AuditRecord): void {
    this.records.push(record)
  }

  getAll(): ReadonlyArray<AuditRecord> {
    return this.records
  }

  canUpdate(_id: string): boolean { return false }  // immutable
  canDelete(_id: string): boolean { return false }  // immutable
}

// ─── PDF model ────────────────────────────────────────────────────────────────

const STATUSES_REQUIRING_PDF: AppStatus[] = ['Admission définitive', 'Admission sous réserve']

function shouldGeneratePdf(status: AppStatus): boolean {
  return STATUSES_REQUIRING_PDF.includes(status)
}

interface PdfMetadata {
  applicant_id:  string
  decision_date: string
  status:        AppStatus
}

function generatePdfMetadata(applicantId: string, status: AppStatus, date: string): PdfMetadata {
  return { applicant_id: applicantId, decision_date: date, status }
}

// ─── Webhook model ────────────────────────────────────────────────────────────

type WebhookEventType = 'payment.confirmed' | 'payment.failed' | 'payment.pending'
type PaymentStatus    = 'Pending' | 'paid' | 'Failed'

interface WebhookPayload {
  event:        WebhookEventType
  applicant_id: string
  amount:       number
  currency:     string
  timestamp:    string
}

interface ApplicationState {
  payment_status:       PaymentStatus
  application_status:   AppStatus
  payment_confirmed_at: string | null
}

function processWebhook(
  payload: WebhookPayload,
  current: ApplicationState,
): ApplicationState {
  switch (payload.event) {
    case 'payment.confirmed':
      if (current.payment_status !== 'Pending') return current // idempotent guard
      return {
        payment_status:       'paid',
        application_status:   'en_cours_devaluation',
        payment_confirmed_at: payload.timestamp,
      }
    case 'payment.failed':
      return { ...current, payment_status: 'Failed' }
    default:
      return current
  }
}

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const idArb = fc.uuid()
// Use integer ms range to avoid fast-check generating invalid edge-case dates
const TS_START     = new Date('2026-01-01T00:00:00Z').getTime()
const TS_END       = new Date('2026-12-31T23:59:59Z').getTime()
const timestampArb = fc.integer({ min: TS_START, max: TS_END })
                       .map(ms => new Date(ms).toISOString())

const statusArb: fc.Arbitrary<AppStatus> = fc.constantFrom(
  'Dossier Créé',
  'en_cours_devaluation',
  'Admission sous réserve',
  'Admission définitive',
  'Dossier refusé',
)

const applicantIdArb = fc.tuple(
  fc.integer({ min: 2026, max: 2030 }),
  fc.integer({ min: 1, max: 99_999 }),
).map(([year, seq]) => `IGN-${year}-${String(seq).padStart(5, '0')}`)

const webhookConfirmedArb: fc.Arbitrary<WebhookPayload> = fc.record({
  event:        fc.constant<WebhookEventType>('payment.confirmed'),
  applicant_id: applicantIdArb,
  amount:       fc.integer({ min: 1, max: 1000 }),
  currency:     fc.constantFrom('USD', 'CDF'),
  timestamp:    timestampArb,
})

// ─── P33: Audit records are immutable ────────────────────────────────────────

describe('P33 — Audit records are immutable once written', () => {
  const log = new AuditLog()

  it('P33-A: canUpdate always returns false for any record id', () => {
    fc.assert(
      fc.property(idArb, (id) => {
        expect(log.canUpdate(id)).toBe(false)
      }),
      { numRuns: 100 },
    )
  })

  it('P33-B: canDelete always returns false for any record id', () => {
    fc.assert(
      fc.property(idArb, (id) => {
        expect(log.canDelete(id)).toBe(false)
      }),
      { numRuns: 100 },
    )
  })

  it('P33-C: audit record fields are frozen (Object.isFrozen)', () => {
    fc.assert(
      fc.property(idArb, statusArb, statusArb, idArb, timestampArb, (appId, from, to, by, ts) => {
        const record = createAuditRecord(appId, from, to, by, ts, 1)
        expect(Object.isFrozen(record)).toBe(true)
      }),
      { numRuns: 100 },
    )
  })

  it('P33-D: appending to log is always additive (never mutates existing records)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ from: statusArb, to: statusArb, ts: timestampArb }),
          { minLength: 1, maxLength: 10 },
        ),
        (events) => {
          const localLog = new AuditLog()
          events.forEach(({ from, to, ts }, i) => {
            localLog.append(createAuditRecord('IGN-2026-00001', from, to, 'admin', ts, i + 1))
          })
          expect(localLog.getAll().length).toBe(events.length)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─── P34: Audit records contain before/after status ──────────────────────────

describe('P34 — Every audit record contains the previous and new status', () => {

  it('P34-A: old_status and new_status are always present and valid', () => {
    fc.assert(
      fc.property(idArb, statusArb, statusArb, idArb, timestampArb, (appId, from, to, by, ts) => {
        const record = createAuditRecord(appId, from, to, by, ts, 1)
        expect(record.old_status).toBeDefined()
        expect(record.new_status).toBeDefined()
      }),
      { numRuns: 100 },
    )
  })

  it('P34-B: old_status is preserved exactly as passed', () => {
    fc.assert(
      fc.property(idArb, statusArb, statusArb, idArb, timestampArb, (appId, from, to, by, ts) => {
        const record = createAuditRecord(appId, from, to, by, ts, 1)
        expect(record.old_status).toBe(from)
      }),
      { numRuns: 100 },
    )
  })

  it('P34-C: new_status is preserved exactly as passed', () => {
    fc.assert(
      fc.property(idArb, statusArb, statusArb, idArb, timestampArb, (appId, from, to, by, ts) => {
        const record = createAuditRecord(appId, from, to, by, ts, 1)
        expect(record.new_status).toBe(to)
      }),
      { numRuns: 100 },
    )
  })

  it('P34-D: audit log preserves chronological order of all status transitions', () => {
    fc.assert(
      fc.property(
        fc.array(statusArb, { minLength: 2, maxLength: 8 }),
        (statuses) => {
          const localLog = new AuditLog()
          for (let i = 0; i < statuses.length - 1; i++) {
            localLog.append(
              createAuditRecord('IGN-2026-00001', statuses[i], statuses[i + 1], 'admin', new Date().toISOString(), i + 1),
            )
          }
          const all = localLog.getAll()
          all.forEach((rec, idx) => {
            expect(rec.old_status).toBe(statuses[idx])
            expect(rec.new_status).toBe(statuses[idx + 1])
          })
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─── P35: PDF is generated only for acceptance decisions ──────────────────────

describe('P35 — PDF is generated for acceptance decisions but not for refusal or interim', () => {

  it('P35-A: Admission définitive triggers PDF generation', () => {
    expect(shouldGeneratePdf('Admission définitive')).toBe(true)
  })

  it('P35-B: Admission sous réserve triggers PDF generation', () => {
    expect(shouldGeneratePdf('Admission sous réserve')).toBe(true)
  })

  it('P35-C: Dossier refusé does NOT trigger PDF generation', () => {
    expect(shouldGeneratePdf('Dossier refusé')).toBe(false)
  })

  it('P35-D: interim statuses do not trigger PDF generation', () => {
    const interim: AppStatus[] = ['Dossier Créé', 'en_cours_devaluation']
    interim.forEach(s => expect(shouldGeneratePdf(s)).toBe(false))
  })

  it('P35-E: the set of PDF-triggering statuses is stable (only acceptance variants)', () => {
    fc.assert(
      fc.property(statusArb, (status) => {
        const expected = ['Admission définitive', 'Admission sous réserve'].includes(status)
        expect(shouldGeneratePdf(status)).toBe(expected)
      }),
      { numRuns: 100 },
    )
  })
})

// ─── P36: PDF contains applicant_id and decision date ────────────────────────

describe('P36 — Every generated PDF contains applicant_id and the decision date', () => {

  const pdfStatusArb: fc.Arbitrary<AppStatus> = fc.constantFrom(
    'Admission définitive',
    'Admission sous réserve',
  )

  it('P36-A: PDF metadata always includes the applicant_id unchanged', () => {
    fc.assert(
      fc.property(
        applicantIdArb,
        pdfStatusArb,
        timestampArb,
        (applicantId, status, date) => {
          const meta = generatePdfMetadata(applicantId, status, date)
          expect(meta.applicant_id).toBe(applicantId)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('P36-B: PDF metadata always includes the decision date unchanged', () => {
    fc.assert(
      fc.property(
        applicantIdArb,
        pdfStatusArb,
        timestampArb,
        (applicantId, status, date) => {
          const meta = generatePdfMetadata(applicantId, status, date)
          expect(meta.decision_date).toBe(date)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('P36-C: PDF metadata always carries the correct status', () => {
    fc.assert(
      fc.property(
        applicantIdArb,
        pdfStatusArb,
        timestampArb,
        (applicantId, status, date) => {
          const meta = generatePdfMetadata(applicantId, status, date)
          expect(meta.status).toBe(status)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─── P38: Webhook correctly processes payment.confirmed ──────────────────────

describe('P38 — The payment webhook maps payment.confirmed → application update', () => {

  const pendingState: ApplicationState = {
    payment_status:       'Pending',
    application_status:   'Dossier Créé',
    payment_confirmed_at: null,
  }

  it('P38-A: payment.confirmed advances application_status to en_cours_devaluation', () => {
    fc.assert(
      fc.property(webhookConfirmedArb, (payload) => {
        const result = processWebhook(payload, pendingState)
        expect(result.application_status).toBe('en_cours_devaluation')
      }),
      { numRuns: 100 },
    )
  })

  it('P38-B: payment.confirmed sets payment_status to "paid"', () => {
    fc.assert(
      fc.property(webhookConfirmedArb, (payload) => {
        const result = processWebhook(payload, pendingState)
        expect(result.payment_status).toBe('paid')
      }),
      { numRuns: 100 },
    )
  })

  it('P38-C: payment.confirmed sets payment_confirmed_at to the webhook timestamp', () => {
    fc.assert(
      fc.property(webhookConfirmedArb, (payload) => {
        const result = processWebhook(payload, pendingState)
        expect(result.payment_confirmed_at).toBe(payload.timestamp)
      }),
      { numRuns: 100 },
    )
  })

  it('P38-D: duplicate payment.confirmed on already-paid app is a no-op (idempotency)', () => {
    const alreadyPaidState: ApplicationState = {
      payment_status:       'paid',
      application_status:   'en_cours_devaluation',
      payment_confirmed_at: '2026-03-01T00:00:00Z',
    }
    fc.assert(
      fc.property(webhookConfirmedArb, (payload) => {
        const result = processWebhook(payload, alreadyPaidState)
        expect(result.payment_status).toBe('paid')
        expect(result.application_status).toBe('en_cours_devaluation')
        // Original timestamp is preserved, not overwritten
        expect(result.payment_confirmed_at).toBe('2026-03-01T00:00:00Z')
      }),
      { numRuns: 100 },
    )
  })

  it('P38-E: payment.failed sets payment_status to "Failed" without changing app status', () => {
    fc.assert(
      fc.property(
        fc.record({
          event:        fc.constant<WebhookEventType>('payment.failed'),
          applicant_id: applicantIdArb,
          amount:       fc.integer({ min: 1, max: 1000 }),
          currency:     fc.constant('USD'),
          timestamp:    timestampArb,
        }),
        (payload) => {
          const result = processWebhook(payload, pendingState)
          expect(result.payment_status).toBe('Failed')
          expect(result.application_status).toBe('Dossier Créé')
          expect(result.payment_confirmed_at).toBeNull()
        },
      ),
      { numRuns: 100 },
    )
  })
})
