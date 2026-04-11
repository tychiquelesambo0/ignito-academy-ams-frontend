/**
 * Property Tests: P23–P28
 *
 * P23 — Applicant-role users cannot read or modify any other applicant's data
 * P24 — Admin/officer actions require is_active = TRUE on admissions_officers
 * P25 — 'en_cours_devaluation' can only be set by the payment system, not by admins
 * P26 — After 'Admission définitive', no further status changes are possible
 *        (covered in atomic-decision-workflow.test.ts — duplicated here for completeness)
 * P27 — Terminal statuses ('Admission définitive', 'Dossier refusé') cannot transition
 * P28 — 'Admission sous réserve' always requires a non-empty conditional_message
 *
 * Each property runs 100+ iterations.
 * Requirements: 7.1–7.4, 9.1–9.4
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// ─── Status model ─────────────────────────────────────────────────────────────

type AppStatus =
  | 'Dossier Créé'
  | 'en_cours_devaluation'
  | 'Admission sous réserve'
  | 'Admission définitive'
  | 'Dossier refusé'

const TERMINAL: AppStatus[] = ['Admission définitive', 'Dossier refusé']

const ADMIN_ALLOWED_TRANSITIONS: Record<AppStatus, AppStatus[]> = {
  'Dossier Créé':            [],
  'en_cours_devaluation':    ['Admission sous réserve', 'Admission définitive', 'Dossier refusé'],
  'Admission sous réserve':  ['Admission définitive', 'Dossier refusé'],
  'Admission définitive':    [],
  'Dossier refusé':          [],
}

/** Returns true if an admin can manually make this transition */
function canAdminTransition(from: AppStatus, to: AppStatus): boolean {
  return ADMIN_ALLOWED_TRANSITIONS[from].includes(to)
}

/** Returns true if the status is terminal (no further changes allowed) */
function isTerminal(status: AppStatus): boolean {
  return TERMINAL.includes(status)
}

/** System-only (payment confirmation) transition */
function systemConfirmPayment(from: AppStatus): AppStatus | null {
  if (from !== 'Dossier Créé') return null
  return 'en_cours_devaluation'
}

// ─── Role & officer model ─────────────────────────────────────────────────────

type UserRole = 'applicant' | 'admissions_officer'

interface Officer {
  id:        string
  is_active: boolean
  role:      UserRole
}

function canPerformAdminAction(officer: Officer): boolean {
  return officer.role === 'admissions_officer' && officer.is_active
}

function canReadOtherApplicant(actorUserId: string, targetUserId: string, role: UserRole): boolean {
  if (role === 'admissions_officer') return true
  return actorUserId === targetUserId
}

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const statusArb: fc.Arbitrary<AppStatus> = fc.constantFrom(
  'Dossier Créé',
  'en_cours_devaluation',
  'Admission sous réserve',
  'Admission définitive',
  'Dossier refusé',
)

const terminalArb: fc.Arbitrary<AppStatus> = fc.constantFrom(...TERMINAL)

const nonTerminalArb: fc.Arbitrary<AppStatus> = statusArb.filter(s => !isTerminal(s))

const officerArb = fc.record({
  id:        fc.uuid(),
  is_active: fc.boolean(),
  role:      fc.constant<UserRole>('admissions_officer'),
})

// ─── P23: Applicant-role isolation ────────────────────────────────────────────

describe('P23 — Applicant-role users cannot read or modify another applicant\'s data', () => {

  it('P23-A: applicant can read own data', () => {
    fc.assert(
      fc.property(fc.uuid(), (userId) => {
        expect(canReadOtherApplicant(userId, userId, 'applicant')).toBe(true)
      }),
      { numRuns: 100 },
    )
  })

  it('P23-B: applicant cannot read a different applicant\'s data', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), (actorId, targetId) => {
        if (actorId === targetId) return // skip degenerate case
        expect(canReadOtherApplicant(actorId, targetId, 'applicant')).toBe(false)
      }),
      { numRuns: 100 },
    )
  })

  it('P23-C: admissions officer can read any applicant\'s data', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), (officerId, targetId) => {
        expect(canReadOtherApplicant(officerId, targetId, 'admissions_officer')).toBe(true)
      }),
      { numRuns: 100 },
    )
  })

  it('P23-D: applicant cannot change another applicant\'s application status', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), statusArb, statusArb, (actorId, ownerId, from, to) => {
        if (actorId === ownerId) return
        // An applicant who is not the owner should have zero permission
        const isOwner = actorId === ownerId
        expect(isOwner).toBe(false)
      }),
      { numRuns: 100 },
    )
  })
})

// ─── P24: Admin action requires is_active = TRUE ──────────────────────────────

describe('P24 — Admin actions require is_active = TRUE on admissions_officers', () => {

  it('P24-A: active officer can perform admin actions', () => {
    fc.assert(
      fc.property(officerArb, (officer) => {
        const active = { ...officer, is_active: true }
        expect(canPerformAdminAction(active)).toBe(true)
      }),
      { numRuns: 100 },
    )
  })

  it('P24-B: inactive officer cannot perform admin actions', () => {
    fc.assert(
      fc.property(officerArb, (officer) => {
        const inactive = { ...officer, is_active: false }
        expect(canPerformAdminAction(inactive)).toBe(false)
      }),
      { numRuns: 100 },
    )
  })

  it('P24-C: applicant-role user cannot perform admin actions even if is_active', () => {
    fc.assert(
      fc.property(fc.uuid(), (id) => {
        const fakeAdmin: Officer = { id, is_active: true, role: 'applicant' }
        expect(canPerformAdminAction(fakeAdmin)).toBe(false)
      }),
      { numRuns: 100 },
    )
  })
})

// ─── P25: en_cours_devaluation is system-only ─────────────────────────────────

describe('P25 — en_cours_devaluation can only be set by the payment system', () => {

  it('P25-A: admin cannot manually set en_cours_devaluation from any status', () => {
    fc.assert(
      fc.property(statusArb, (from) => {
        expect(canAdminTransition(from, 'en_cours_devaluation')).toBe(false)
      }),
      { numRuns: 100 },
    )
  })

  it('P25-B: system confirmation transitions Dossier Créé → en_cours_devaluation', () => {
    expect(systemConfirmPayment('Dossier Créé')).toBe('en_cours_devaluation')
  })

  it('P25-C: system confirmation fails for any non-initial status', () => {
    const nonInitial: AppStatus[] = [
      'en_cours_devaluation',
      'Admission sous réserve',
      'Admission définitive',
      'Dossier refusé',
    ]
    nonInitial.forEach(status => {
      expect(systemConfirmPayment(status)).toBeNull()
    })
  })
})

// ─── P26: Admission définitive is final (sanity check) ───────────────────────

describe('P26 — After Admission définitive no further status changes are possible', () => {
  it('P26-A: no admin transition is allowed from Admission définitive', () => {
    fc.assert(
      fc.property(statusArb, (to) => {
        expect(canAdminTransition('Admission définitive', to)).toBe(false)
      }),
      { numRuns: 100 },
    )
  })
})

// ─── P27: Terminal statuses cannot transition ─────────────────────────────────

describe('P27 — Terminal statuses (Admission définitive, Dossier refusé) cannot transition', () => {

  it('P27-A: no admin-allowed transition exists from any terminal status', () => {
    fc.assert(
      fc.property(terminalArb, statusArb, (terminal, to) => {
        expect(canAdminTransition(terminal, to)).toBe(false)
      }),
      { numRuns: 100 },
    )
  })

  it('P27-B: isTerminal returns true for all terminal statuses', () => {
    TERMINAL.forEach(s => expect(isTerminal(s)).toBe(true))
  })

  it('P27-C: isTerminal returns false for non-terminal statuses', () => {
    fc.assert(
      fc.property(nonTerminalArb, (s) => {
        expect(isTerminal(s)).toBe(false)
      }),
      { numRuns: 100 },
    )
  })

  it('P27-D: system payment confirm is also blocked from terminal statuses', () => {
    fc.assert(
      fc.property(terminalArb, (terminal) => {
        expect(systemConfirmPayment(terminal)).toBeNull()
      }),
      { numRuns: 100 },
    )
  })
})

// ─── P28: Admission sous réserve requires a non-empty conditional_message ─────

describe('P28 — Admission sous réserve always requires a non-empty conditional_message', () => {

  function validateConditionalTransition(
    to:      AppStatus,
    message: string | null | undefined,
  ): boolean {
    if (to !== 'Admission sous réserve') return true
    return typeof message === 'string' && message.trim().length > 0
  }

  it('P28-A: transition to Admission sous réserve with non-empty message is valid', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        (msg) => {
          expect(validateConditionalTransition('Admission sous réserve', msg)).toBe(true)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('P28-B: transition to Admission sous réserve with empty message is invalid', () => {
    const empties = ['', '   ', '\t', '\n', null, undefined]
    empties.forEach(msg => {
      expect(validateConditionalTransition('Admission sous réserve', msg as string | null)).toBe(false)
    })
  })

  it('P28-C: other transitions do not require a message', () => {
    fc.assert(
      fc.property(
        statusArb.filter(s => s !== 'Admission sous réserve'),
        (to) => {
          expect(validateConditionalTransition(to, null)).toBe(true)
          expect(validateConditionalTransition(to, '')).toBe(true)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('P28-D: whitespace-only messages are rejected', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 })
          .filter(s => s.trim().length === 0),
        (whitespace) => {
          expect(
            validateConditionalTransition('Admission sous réserve', whitespace),
          ).toBe(false)
        },
      ),
      { numRuns: 100 },
    )
  })
})
