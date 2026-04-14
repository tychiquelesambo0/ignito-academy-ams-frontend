/**
 * sendDecisionNotification
 *
 * Sends the correct branded email to an applicant after an admin records
 * an admission decision. Called from /api/admin/decision and MUST be awaited
 * before the HTTP response is returned (Vercel kills fire-and-forget promises).
 *
 * Uses Resend directly — no email_logs table dependency so there are fewer
 * failure points.
 *
 * Never throws — always returns { sent, wasMock, error? }.
 */

import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/server'
import {
  finalAcceptanceEmail,
  conditionalAcceptanceEmail,
  refusalEmail,
} from './templates'

type DecisionStatus =
  | 'Admission définitive'
  | 'Admission sous réserve'
  | 'Dossier refusé'

interface SendDecisionNotificationOpts {
  applicantId:         string
  status:              DecisionStatus
  conditionalMessage?: string | null
}

interface SendResult {
  sent:    boolean
  wasMock: boolean
  error?:  string
}

export async function sendDecisionNotification(
  opts: SendDecisionNotificationOpts,
): Promise<SendResult> {
  const { applicantId, status, conditionalMessage } = opts

  try {
    const admin = createAdminClient()

    // ── 1. Look up application → user_id ────────────────────────────────────
    const { data: appRow, error: appErr } = await admin
      .from('applications')
      .select('user_id')
      .eq('applicant_id', applicantId)
      .maybeSingle()

    if (appErr || !appRow) {
      const msg = `Application not found: ${applicantId} — ${appErr?.message ?? 'no row'}`
      console.error('[sendDecisionNotification]', msg)
      return { sent: false, wasMock: false, error: msg }
    }

    // ── 2. Look up applicant details ─────────────────────────────────────────
    const { data: applicant, error: aptErr } = await admin
      .from('applicants')
      .select('prenom, nom, email')
      .eq('id', appRow.user_id)
      .maybeSingle()

    if (aptErr || !applicant) {
      const msg = `Applicant not found for user_id ${appRow.user_id} — ${aptErr?.message ?? 'no row'}`
      console.error('[sendDecisionNotification]', msg)
      return { sent: false, wasMock: false, error: msg }
    }

    // ── 3. Build email for the decision type ─────────────────────────────────
    let subject: string
    let html:    string

    if (status === 'Admission définitive') {
      ;({ subject, html } = finalAcceptanceEmail({
        prenom: applicant.prenom,
        nom:    applicant.nom,
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
        prenom: applicant.prenom,
        nom:    applicant.nom,
        applicantId,
      }))
    }

    // ── 4. Check Resend API key ───────────────────────────────────────────────
    const resendKey = process.env.RESEND_API_KEY?.trim()
    const isMock    = !resendKey
                      || resendKey === 'your-resend-api-key'
                      || resendKey.startsWith('mock-')

    if (isMock) {
      console.warn(
        `[sendDecisionNotification] MOCK — RESEND_API_KEY not configured.` +
        ` Would send "${subject}" to ${applicant.email}`,
      )
      return { sent: true, wasMock: true }
    }

    // ── 5. Send via Resend ────────────────────────────────────────────────────
    const fromEmail = process.env.FROM_EMAIL?.trim()
                   || 'Ignito Academy <admissions@ignitoacademy.com>'

    console.log(
      `[sendDecisionNotification] sending "${status}" to ${applicant.email}` +
      ` from ${fromEmail}`,
    )

    const resend               = new Resend(resendKey)
    const { data, error: sendErr } = await resend.emails.send({
      from:    fromEmail,
      to:      [applicant.email],
      subject,
      html,
    })

    if (sendErr) {
      console.error('[sendDecisionNotification] Resend error:', sendErr)
      return { sent: false, wasMock: false, error: sendErr.message }
    }

    console.log(
      `[sendDecisionNotification] ✓ sent to ${applicant.email},` +
      ` messageId=${data?.id}`,
    )
    return { sent: true, wasMock: false }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[sendDecisionNotification] unexpected error:', msg)
    return { sent: false, wasMock: false, error: msg }
  }
}
