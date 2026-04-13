/**
 * Application status state machine.
 *
 * Encodes the full set of valid status transitions for the Ignito Academy AMS:
 *
 *   Dossier Créé  ──(payment)──►  en_cours_devaluation
 *                                      │
 *                          ┌───────────┴────────────────────┐
 *                          ▼                                ▼
 *               Admission sous réserve            Admission définitive (terminal)
 *                          │                      Dossier refusé      (terminal)
 *                          ▼
 *               Admission définitive (terminal)
 *               Dossier refusé      (terminal)
 */

export type ApplicationStatus =
  | 'Dossier Créé'
  | 'en_cours_devaluation'
  | 'Admission sous réserve'
  | 'Admission définitive'
  | 'Dossier refusé'

export type PaymentStatus = 'Pending' | 'paid' | 'Confirmed' | 'Failed' | 'Waived'

export const TERMINAL_STATUSES: ApplicationStatus[] = [
  'Admission définitive',
  'Dossier refusé',
]

/** Allowed manual transitions for admissions officers */
const ADMIN_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  'Dossier Créé':            [],
  'en_cours_devaluation':    ['Admission sous réserve', 'Admission définitive', 'Dossier refusé'],
  'Admission sous réserve':  ['Admission définitive', 'Dossier refusé'],
  'Admission définitive':    [],
  'Dossier refusé':          [],
}

/**
 * Returns true if the status is terminal (no further changes allowed).
 */
export function isTerminal(status: ApplicationStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

/**
 * Returns true if an admin may manually transition from `from` to `to`.
 * Note: `en_cours_devaluation` is never available to admins — it is set
 * automatically when payment is confirmed.
 */
export function canAdminTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return ADMIN_TRANSITIONS[from].includes(to)
}

/**
 * Returns all statuses an admin may transition to from the given status.
 */
export function adminAllowedTransitions(from: ApplicationStatus): ApplicationStatus[] {
  return [...ADMIN_TRANSITIONS[from]]
}

/**
 * System-triggered transition on payment confirmation.
 * Returns null if the transition is invalid (e.g. already evaluated).
 */
export function systemConfirmPayment(current: ApplicationStatus): ApplicationStatus | null {
  if (current !== 'Dossier Créé') return null
  return 'en_cours_devaluation'
}

/**
 * Returns true if an applicant may resubmit (conditional admission loop).
 * Requires: payment made AND current status is 'Admission sous réserve'.
 */
export function canApplicantResubmit(
  status:        ApplicationStatus,
  paymentStatus: PaymentStatus,
): boolean {
  return status === 'Admission sous réserve'
      && (paymentStatus === 'paid' || paymentStatus === 'Confirmed' || paymentStatus === 'Waived')
}

/**
 * Returns true if the applicant's documents are locked (cannot be changed/deleted).
 * Documents are locked after payment UNLESS:
 *  - status is « Admission sous réserve », or
 *  - the admissions team set `conditional_message` (demande de pièce complémentaire).
 */
export function isDocumentLocked(
  status:               ApplicationStatus,
  paymentStatus:      PaymentStatus,
  conditionalMessage?: string | null,
): boolean {
  const paymentConfirmed =
    paymentStatus === 'paid' ||
    paymentStatus === 'Confirmed' ||
    paymentStatus === 'Waived'
  const uploadReopened =
    status === 'Admission sous réserve' ||
    Boolean(conditionalMessage?.trim())
  return paymentConfirmed && !uploadReopened
}
