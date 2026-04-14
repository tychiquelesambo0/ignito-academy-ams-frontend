import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { sendDecisionNotification } from '@/lib/email/send-decision-notification'

const DecisionSchema = z.object({
  applicantId:        z.string().min(1),
  status:             z.enum([
    'Admission sous réserve',
    'Admission définitive',
    'Dossier refusé',
  ]),
  conditionalMessage: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    // ── 1. Verify the caller is an active admissions officer ─────────────────
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    const { data: officer } = await supabase
      .from('admissions_officers')
      .select('id, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!officer) {
      return NextResponse.json(
        { error: 'Accès refusé. Réservé au personnel autorisé.' },
        { status: 403 },
      )
    }

    // ── 2. Validate payload ──────────────────────────────────────────────────
    const body   = await req.json()
    const parsed = DecisionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { applicantId, status, conditionalMessage } = parsed.data

    if (status === 'Admission sous réserve' && !conditionalMessage?.trim()) {
      return NextResponse.json(
        { error: "Un message explicatif est obligatoire pour l'admission sous réserve." },
        { status: 400 },
      )
    }

    // ── 3. Apply the decision ────────────────────────────────────────────────
    const admin = createAdminClient()

    const { data: current } = await admin
      .from('applications')
      .select('application_status')
      .eq('applicant_id', applicantId)
      .single()

    const previousStatus = current?.application_status ?? null

    const updatePayload: Record<string, unknown> = {
      application_status: status,
      updated_at:         new Date().toISOString(),
    }

    if (status === 'Admission sous réserve' && conditionalMessage?.trim()) {
      updatePayload.conditional_message = conditionalMessage.trim()
    } else if (status === 'Admission définitive' || status === 'Dossier refusé') {
      updatePayload.conditional_message = null
    }

    const { data: updated, error: updateError } = await admin
      .from('applications')
      .update(updatePayload)
      .eq('applicant_id', applicantId)
      .select('applicant_id, application_status, conditional_message')
      .single()

    if (updateError || !updated) {
      console.error('[admin/decision] update error:', updateError)
      return NextResponse.json(
        { error: 'Impossible de mettre à jour le statut du dossier.' },
        { status: 500 },
      )
    }

    // ── 4. Log the decision in audit_trail (best-effort) ────────────────────
    admin
      .from('audit_trail')
      .insert({
        applicant_id:    applicantId,
        admin_id:        user.id,
        previous_status: previousStatus as never,
        new_status:      status as never,
        notes:           conditionalMessage?.trim() ?? null,
      })
      .then()

    // ── 5. Send decision notification email — AWAITED ────────────────────────
    // CRITICAL: must be awaited before returning the response.
    // In Vercel serverless, fire-and-forget (.then()) is killed when the
    // HTTP response is sent — the email would never go out.
    const emailResult = await sendDecisionNotification({
      applicantId,
      status,
      conditionalMessage: conditionalMessage?.trim() ?? null,
    })

    console.log(`[admin/decision] email result for ${applicantId}:`, emailResult)

    return NextResponse.json({
      success:    true,
      updated,
      emailSent:  emailResult.sent,
      emailMock:  emailResult.wasMock,
      emailError: emailResult.error ?? null,
    })

  } catch (err) {
    console.error('[admin/decision] unexpected error:', err)
    return NextResponse.json(
      { error: 'Erreur serveur inattendue.' },
      { status: 500 },
    )
  }
}
