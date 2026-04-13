/**
 * Coverage tests for src/lib/status-machine.ts
 */
import { describe, it, expect } from 'vitest'
import {
  isTerminal,
  canAdminTransition,
  adminAllowedTransitions,
  systemConfirmPayment,
  canApplicantResubmit,
  isDocumentLocked,
  TERMINAL_STATUSES,
  type ApplicationStatus,
} from '@/lib/status-machine'

const ALL_STATUSES: ApplicationStatus[] = [
  'Dossier Créé',
  'en_cours_devaluation',
  'Admission sous réserve',
  'Admission définitive',
  'Dossier refusé',
]

describe('isTerminal', () => {
  it('returns true for Admission définitive', () => {
    expect(isTerminal('Admission définitive')).toBe(true)
  })

  it('returns true for Dossier refusé', () => {
    expect(isTerminal('Dossier refusé')).toBe(true)
  })

  it('returns false for non-terminal statuses', () => {
    expect(isTerminal('Dossier Créé')).toBe(false)
    expect(isTerminal('en_cours_devaluation')).toBe(false)
    expect(isTerminal('Admission sous réserve')).toBe(false)
  })

  it('TERMINAL_STATUSES matches isTerminal', () => {
    ALL_STATUSES.forEach(s => {
      expect(isTerminal(s)).toBe(TERMINAL_STATUSES.includes(s))
    })
  })
})

describe('canAdminTransition', () => {
  it('allows en_cours → Admission définitive', () => {
    expect(canAdminTransition('en_cours_devaluation', 'Admission définitive')).toBe(true)
  })

  it('allows en_cours → Admission sous réserve', () => {
    expect(canAdminTransition('en_cours_devaluation', 'Admission sous réserve')).toBe(true)
  })

  it('allows en_cours → Dossier refusé', () => {
    expect(canAdminTransition('en_cours_devaluation', 'Dossier refusé')).toBe(true)
  })

  it('allows Admission sous réserve → Admission définitive', () => {
    expect(canAdminTransition('Admission sous réserve', 'Admission définitive')).toBe(true)
  })

  it('blocks admin from setting en_cours_devaluation manually', () => {
    ALL_STATUSES.forEach(from => {
      expect(canAdminTransition(from, 'en_cours_devaluation')).toBe(false)
    })
  })

  it('blocks any transition from terminal statuses', () => {
    TERMINAL_STATUSES.forEach(terminal => {
      ALL_STATUSES.forEach(to => {
        expect(canAdminTransition(terminal, to)).toBe(false)
      })
    })
  })

  it('blocks transitions from Dossier Créé (admin cannot skip evaluation)', () => {
    ALL_STATUSES.forEach(to => {
      expect(canAdminTransition('Dossier Créé', to)).toBe(false)
    })
  })
})

describe('adminAllowedTransitions', () => {
  it('returns correct targets for en_cours_devaluation', () => {
    const t = adminAllowedTransitions('en_cours_devaluation')
    expect(t).toContain('Admission définitive')
    expect(t).toContain('Admission sous réserve')
    expect(t).toContain('Dossier refusé')
    expect(t).not.toContain('en_cours_devaluation')
  })

  it('returns empty array for terminal statuses', () => {
    TERMINAL_STATUSES.forEach(s => {
      expect(adminAllowedTransitions(s)).toHaveLength(0)
    })
  })

  it('returns a new array each call (no mutation)', () => {
    const a = adminAllowedTransitions('en_cours_devaluation')
    const b = adminAllowedTransitions('en_cours_devaluation')
    a.push('Dossier Créé' as ApplicationStatus)
    expect(b).not.toContain('Dossier Créé')
  })
})

describe('systemConfirmPayment', () => {
  it('transitions Dossier Créé → en_cours_devaluation', () => {
    expect(systemConfirmPayment('Dossier Créé')).toBe('en_cours_devaluation')
  })

  it('returns null for any other starting status', () => {
    const others: ApplicationStatus[] = [
      'en_cours_devaluation',
      'Admission sous réserve',
      'Admission définitive',
      'Dossier refusé',
    ]
    others.forEach(s => expect(systemConfirmPayment(s)).toBeNull())
  })
})

describe('canApplicantResubmit', () => {
  it('allows resubmission when status is Admission sous réserve and payment is paid', () => {
    expect(canApplicantResubmit('Admission sous réserve', 'paid')).toBe(true)
    expect(canApplicantResubmit('Admission sous réserve', 'Confirmed')).toBe(true)
  })

  it('blocks resubmission when status is not conditional', () => {
    expect(canApplicantResubmit('en_cours_devaluation', 'paid')).toBe(false)
    expect(canApplicantResubmit('Dossier Créé', 'paid')).toBe(false)
  })

  it('blocks resubmission when payment is not confirmed', () => {
    expect(canApplicantResubmit('Admission sous réserve', 'Pending')).toBe(false)
    expect(canApplicantResubmit('Admission sous réserve', 'Failed')).toBe(false)
  })
})

describe('isDocumentLocked', () => {
  it('locks documents when payment is confirmed and status is not conditional', () => {
    expect(isDocumentLocked('en_cours_devaluation', 'paid')).toBe(true)
    expect(isDocumentLocked('Admission définitive', 'paid')).toBe(true)
    expect(isDocumentLocked('en_cours_devaluation', 'Confirmed')).toBe(true)
  })

  it('unlocks documents during conditional admission even when paid', () => {
    expect(isDocumentLocked('Admission sous réserve', 'paid')).toBe(false)
    expect(isDocumentLocked('Admission sous réserve', 'Confirmed')).toBe(false)
  })

  it('unlocks documents when payment is pending', () => {
    expect(isDocumentLocked('Dossier Créé', 'Pending')).toBe(false)
    expect(isDocumentLocked('en_cours_devaluation', 'Pending')).toBe(false)
  })

  it('unlocks documents when payment failed', () => {
    expect(isDocumentLocked('en_cours_devaluation', 'Failed')).toBe(false)
  })

  it('locks documents when payment is Waived and no supplement window', () => {
    expect(isDocumentLocked('en_cours_devaluation', 'Waived')).toBe(true)
  })

  it('unlocks documents when admissions set conditional_message (demande complémentaire)', () => {
    expect(isDocumentLocked('en_cours_devaluation', 'Confirmed', 'Veuillez envoyer votre EXETAT.')).toBe(
      false,
    )
    expect(isDocumentLocked('en_cours_devaluation', 'Waived', 'Pièce manquante')).toBe(false)
  })
})
