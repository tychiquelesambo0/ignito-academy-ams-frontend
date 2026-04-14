/**
 * Shared helper: send the correct decision/status notification email
 * to an applicant after an admin makes a decision or a status change occurs.
 *
 * Used by:
 *  - /api/admin/decision  (after status update)
 *  - future automated triggers
 *
 * Never throws — returns { sent, wasMock, error }.
 */

import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/server'
import {
  finalAcceptanceEmail,
  conditionalAcceptanceEmail,
  refusalEmail,
} from './templates'

// ─── Types ───────────────────────────────────────────────────────────────────

type DecisionStatus =
  | 'Admission définitive'
  | 'Admission sous réserve'
  | 'Dossier refusé'

interface SendDecisionNotificationOpts {
  /** Formatted applicant ID, e.g. "IGN-2026-00008" */
  applicantId:         string
  status:              DecisionStatus
  conditionalMessage?: string | null
}

interface SendResult {
  sent:    boolean
  wasMock: boolean
  error?:  string
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function sendDecisionNotification(
  opts: SendDecisionNotificationOpts,
): Promise<SendResult> {
  const { applicantId, status, conditionalMessage } = opts

  try {
    const admin = createAdminClient()

    // 1. Look up application to get user_id
    const { data: appRow, error: appErr } = await admin
      .from('applications')
      .select('user_id')
      .eq('applicant_id', applicantId)
      .maybeSingle()

    if (appErr || !appRow) {
      return { sent: false, wasMock: false, error: `Application not found: ${applicantId}` }
    }

    // 2. Look up applicant details
    const { data: applicant, error: aptErr } = await admin
      .from('applicants')
      .select('prenom, nom, email')
      .eq('id', appRow.user_id)
      .maybeSingle()

    if (aptErr || !applicant) {
      return { sent: false, wasMock: false, error: `Applicant not found for user_id: ${appRow.user_id}` }
    }

    // 3. Build the email for the correct decision type
    let subject: string
    let html:    string

    if (status === 'Admission définitive') {
      ;({ subject, html } = finalAcceptanceEmail({
        prenom:      applicant.prenom,
        nom:         applicant.nom,
        applicantId,
      }))
    } else if (status === 'Admission sous réserve') {
      ;({ subject, html } = conditionalAcceptanceEmail({
        prenom:             applicant.prenom,
        nom:                applicant.nom,
        applicantId,
        conditionalMessage: conditionalMessage ?? '',
      }))
    } else {
      ;({ subject, html } = refusalEmail({
        prenom:      applicant.prenom,
        nom:         applicant.nom,
        applicantId,
      }))
    }

    // 4. Check for mock mode
    const resendKey = process.env.RESEND_API_KEY
    const isMock    = !resendKey || resendKey.startsWith('mock-') || resendKey === 'your-resend-api-key'

    if (isMock) {
      console.warn(
        `[sendDecisionNotification] MOCK — would send "${subject}" to ${applicant.email}`,
      )
      return { sent: true, wasMock: true }
    }

    // 5. Send via Resend
    const resend    = new Resend(resendKey)
    const fromEmail = process.env.FROM_EMAIL?.trim() || 'Ignito Academy <noreply@ignitoacademy.com>'

    const { error: sendErr } = await resend.emails.send({
      from:    fromEmail,
      to:      [applicant.email],
      subject,
      html,
    })

    if (sendErr) {
      console.error('[sendDecisionNotification] Resend error:', sendErr)
      return { sent: false, wasMock: false, error: sendErr.message }
    }

    console.log(`[sendDecisionNotification] ✓ sent "${status}" email to ${applicant.email}`)
    return { sent: true, wasMock: false }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[sendDecisionNotification] unexpected error:', msg)
    return { sent: false, wasMock: false, error: msg }
  }
}
