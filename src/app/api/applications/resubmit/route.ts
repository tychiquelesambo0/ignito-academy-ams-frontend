// POST /api/applications/resubmit
// Applicant-only: after uploading missing documents, resubmit the application
// for re-evaluation. Transitions status back to 'en_cours_devaluation' and
// clears the conditional_message.
//
// Uses the service-role client for the update so RLS WITH CHECK constraints
// do not block the transition. Ownership and status guards run first in
// application code, so security is maintained.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the caller via their session cookie
    const supabase = await createClient()
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }

    // 2. Parse body
    const { applicant_id } = await req.json()
    if (!applicant_id) {
      return NextResponse.json({ error: 'applicant_id est requis.' }, { status: 400 })
    }

    // 3. Fetch the application (service client so we can read all columns)
    const { data: app, error: fetchErr } = await adminSupabase
      .from('applications')
      .select('applicant_id, application_status, payment_status, user_id')
      .eq('applicant_id', applicant_id)
      .single()

    if (fetchErr || !app) {
      console.error('[resubmit] fetch error:', fetchErr)
      return NextResponse.json(
        { error: 'Dossier introuvable.', detail: fetchErr?.message },
        { status: 404 },
      )
    }

    // 4. Ownership check (applicant may only resubmit their own application)
    if ((app as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    }

    // 5. Status guard — only allow from 'Admission sous réserve'
    if ((app as any).application_status !== 'Admission sous réserve') {
      return NextResponse.json(
        {
          error: `Le dossier est en statut "${(app as any).application_status}" et ne peut pas être soumis à nouveau pour le moment.`,
        },
        { status: 400 },
      )
    }

    // 6. Transition back to evaluation + clear the admin message
    const { error: updateErr } = await adminSupabase
      .from('applications')
      .update({
        application_status: 'en_cours_devaluation',
        conditional_message: null,
      } as any)
      .eq('applicant_id', applicant_id)

    if (updateErr) {
      console.error('[resubmit] update error:', updateErr)
      return NextResponse.json(
        { error: 'Erreur lors de la soumission.', detail: updateErr.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[resubmit] unexpected error:', err?.message ?? err)
    return NextResponse.json(
      { error: 'Erreur interne du serveur.', detail: err?.message },
      { status: 500 },
    )
  }
}
