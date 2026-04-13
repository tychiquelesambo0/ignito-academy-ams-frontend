/**
 * Unit tests: Application status transition logic
 * Covers the complete transition graph for both admin actions and system actions.
 * Requirements: 12.1–12.7, 13.1–13.6, 14.1 (status lifecycle)
 */

import { describe, it, expect } from 'vitest'
import { isDocumentLocked } from '@/lib/status-machine'

// ─── Status transition model ──────────────────────────────────────────────────

type ApplicationStatus =
  | 'Dossier Créé'
  | 'en_cours_devaluation'
  | 'Admission sous réserve'
  | 'Admission définitive'
  | 'Dossier refusé'

type PaymentStatus = 'Pending' | 'paid' | 'Confirmed' | 'Failed'

const TERMINAL_STATUSES = new Set<ApplicationStatus>([
  'Admission définitive',
  'Dossier refusé',
])

// Transitions an admin officer may perform via the status dropdown
const ADMIN_ALLOWED_TARGETS = new Set<ApplicationStatus>([
  'Admission sous réserve',
  'Admission définitive',
  'Dossier refusé',
])

// Transitions the system performs automatically
const SYSTEM_TRANSITIONS: Partial<Record<ApplicationStatus, ApplicationStatus>> = {
  'Dossier Créé': 'en_cours_devaluation',   // triggered by payment confirmation
}

function isTerminal(status: ApplicationStatus): boolean {
  return TERMINAL_STATUSES.has(status)
}

function canAdminTransition(
  current: ApplicationStatus,
  target:  ApplicationStatus,
): { allowed: boolean; reason?: string } {
  if (current === target) {
    return { allowed: false, reason: 'Le statut cible est identique au statut actuel.' }
  }
  if (isTerminal(current)) {
    return { allowed: false, reason: `Le statut "${current}" est terminal et ne peut plus être modifié.` }
  }
  if (!ADMIN_ALLOWED_TARGETS.has(target)) {
    return { allowed: false, reason: `"${target}" n'est pas une décision manuelle valide.` }
  }
  return { allowed: true }
}

function canApplicantResubmit(
  current:       ApplicationStatus,
  paymentStatus: PaymentStatus,
): { allowed: boolean; reason?: string } {
  if (current !== 'Admission sous réserve') {
    return { allowed: false, reason: 'La re-soumission n\'est disponible qu\'en statut "Admission sous réserve".' }
  }
  if (paymentStatus !== 'paid' && paymentStatus !== 'Confirmed') {
    return { allowed: false, reason: 'Le paiement doit être confirmé pour pouvoir re-soumettre.' }
  }
  return { allowed: true }
}

function systemTransition(current: ApplicationStatus, paymentConfirmed: boolean): ApplicationStatus {
  if (paymentConfirmed && current === 'Dossier Créé') {
    return 'en_cours_devaluation'
  }
  return current
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Status transition — terminal state invariant', () => {

  it('"Admission définitive" is terminal', () => {
    expect(isTerminal('Admission définitive')).toBe(true)
  })

  it('"Dossier refusé" is terminal', () => {
    expect(isTerminal('Dossier refusé')).toBe(true)
  })

  it('"en_cours_devaluation" is NOT terminal', () => {
    expect(isTerminal('en_cours_devaluation')).toBe(false)
  })

  it('"Admission sous réserve" is NOT terminal', () => {
    expect(isTerminal('Admission sous réserve')).toBe(false)
  })

  it('"Dossier Créé" is NOT terminal', () => {
    expect(isTerminal('Dossier Créé')).toBe(false)
  })
})

describe('Status transition — admin allowed transitions', () => {

  // ── Valid transitions ────────────────────────────────────────────────────────
  const validTransitions: [ApplicationStatus, ApplicationStatus][] = [
    ['en_cours_devaluation',  'Admission sous réserve'],
    ['en_cours_devaluation',  'Admission définitive'],
    ['en_cours_devaluation',  'Dossier refusé'],
    ['Admission sous réserve','Admission définitive'],
    ['Admission sous réserve','Dossier refusé'],
    ['Dossier Créé',          'Admission sous réserve'],  // edge case — should allow
    ['Dossier Créé',          'Admission définitive'],
  ]
  validTransitions.forEach(([from, to]) => {
    it(`allows: ${from} → ${to}`, () => {
      expect(canAdminTransition(from, to).allowed).toBe(true)
    })
  })

  // ── Blocked: terminal → any ───────────────────────────────────────────────────
  const terminalSources: ApplicationStatus[] = ['Admission définitive', 'Dossier refusé']
  const anyTarget: ApplicationStatus[] = ['en_cours_devaluation', 'Admission sous réserve', 'Admission définitive', 'Dossier refusé']

  terminalSources.forEach(from => {
    anyTarget.filter(t => t !== from).forEach(to => {
      it(`blocks terminal: ${from} → ${to}`, () => {
        const r = canAdminTransition(from, to)
        expect(r.allowed).toBe(false)
        expect(r.reason).toMatch(/terminal/)
      })
    })
  })

  // ── Blocked: same status ──────────────────────────────────────────────────────
  it('blocks transition to the same status', () => {
    const r = canAdminTransition('en_cours_devaluation', 'en_cours_devaluation')
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/identique/)
  })

  // ── Admin cannot set "en_cours_devaluation" manually ─────────────────────────
  it('admin cannot set "en_cours_devaluation" (automatic state)', () => {
    const r = canAdminTransition('Dossier Créé', 'en_cours_devaluation')
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/décision|manuelle/i)
  })
})

describe('Status transition — system payment trigger', () => {

  it('payment confirmation advances "Dossier Créé" → "en_cours_devaluation"', () => {
    expect(systemTransition('Dossier Créé', true)).toBe('en_cours_devaluation')
  })

  it('payment failure keeps status unchanged', () => {
    expect(systemTransition('Dossier Créé', false)).toBe('Dossier Créé')
  })

  it('payment confirmation on already-advanced status has no effect', () => {
    expect(systemTransition('en_cours_devaluation', true)).toBe('en_cours_devaluation')
    expect(systemTransition('Admission sous réserve', true)).toBe('Admission sous réserve')
  })

  it('payment confirmation does NOT override terminal status', () => {
    expect(systemTransition('Admission définitive', true)).toBe('Admission définitive')
    expect(systemTransition('Dossier refusé', true)).toBe('Dossier refusé')
  })
})

describe('Status transition — applicant resubmission (conditional loop)', () => {

  it('allows resubmit from "Admission sous réserve" with paid status', () => {
    expect(canApplicantResubmit('Admission sous réserve', 'paid').allowed).toBe(true)
    expect(canApplicantResubmit('Admission sous réserve', 'Confirmed').allowed).toBe(true)
  })

  it('blocks resubmit from any status other than "Admission sous réserve"', () => {
    const others: ApplicationStatus[] = ['Dossier Créé', 'en_cours_devaluation', 'Admission définitive', 'Dossier refusé']
    others.forEach(status => {
      expect(canApplicantResubmit(status, 'paid').allowed).toBe(false)
    })
  })

  it('blocks resubmit when payment is Pending', () => {
    expect(canApplicantResubmit('Admission sous réserve', 'Pending').allowed).toBe(false)
  })

  it('blocks resubmit when payment failed', () => {
    expect(canApplicantResubmit('Admission sous réserve', 'Failed').allowed).toBe(false)
  })
})

describe('Status transition — document lock/unlock rules', () => {
  it('documents are unlocked before payment', () => {
    expect(isDocumentLocked('Dossier Créé', 'Pending')).toBe(false)
  })

  it('documents are locked once payment is confirmed', () => {
    expect(isDocumentLocked('en_cours_devaluation', 'paid')).toBe(true)
    expect(isDocumentLocked('en_cours_devaluation', 'Confirmed')).toBe(true)
  })

  it('documents are unlocked during conditional admission', () => {
    expect(isDocumentLocked('Admission sous réserve', 'paid')).toBe(false)
  })

  it('documents remain locked for final decision states', () => {
    expect(isDocumentLocked('Admission définitive', 'paid')).toBe(true)
    expect(isDocumentLocked('Dossier refusé', 'paid')).toBe(true)
  })
})
