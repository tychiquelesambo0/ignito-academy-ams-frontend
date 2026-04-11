// POST /api/applications/conditional
// Admin-only: set application_status to 'Admission sous réserve' and store
// the conditional_message explaining what document is required.
// Uses the version-check RPC for optimistic locking, then updates the message.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate caller
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify caller is an active officer
    const { data: officer } = await supabase
      .from('admissions_officers')
      .select('id')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    if (!officer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { applicant_id, conditional_message, expected_version } = await req.json()

    if (!applicant_id || !conditional_message?.trim() || expected_version == null) {
      return NextResponse.json(
        { error: 'applicant_id, conditional_message et expected_version sont requis.' },
        { status: 400 },
      )
    }

    // Step 1: update status atomically via optimistic-lock RPC
    const { data: rpcResult, error: rpcErr } = await supabase.rpc(
      'update_application_status_with_version_check',
      {
        p_applicant_id:     applicant_id,
        p_new_status:       'Admission sous réserve',
        p_expected_version: expected_version,
      } as any,
    )

    if (rpcErr || rpcResult === false) {
      return NextResponse.json(
        {
          error:   'VERSION_CONFLICT',
          message: "Cette candidature a été modifiée par un autre utilisateur. Veuillez actualiser la page.",
        },
        { status: 409 },
      )
    }

    // Step 2: write the conditional message
    const { error: msgErr } = await (supabase as any)
      .from('applications')
      .update({ conditional_message: conditional_message.trim() })
      .eq('applicant_id', applicant_id)

    if (msgErr) {
      return NextResponse.json({ error: 'Statut mis à jour mais message non enregistré.', detail: msgErr.message }, { status: 500 })
    }

    // Step 3: audit trail
    const { data: app } = await supabase
      .from('applications')
      .select('application_status')
      .eq('applicant_id', applicant_id)
      .single()

    await (supabase as any).from('audit_trail').insert({
      applicant_id,
      admin_id:        user.id,
      previous_status: (app as any)?.application_status ?? 'en_cours_devaluation',
      new_status:      'Admission sous réserve',
      notes:           `Admission conditionnelle — message : ${conditional_message.trim().slice(0, 100)}`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('/api/applications/conditional error:', err)
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 })
  }
}
