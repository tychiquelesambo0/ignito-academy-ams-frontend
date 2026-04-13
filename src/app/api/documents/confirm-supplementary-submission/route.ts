import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/documents/confirm-supplementary-submission
 *
 * Le candidat confie au Bureau des admissions qu'il a terminé le dépôt
 * des pièces demandées (conditional_message). Efface le message : les
 * bannières du tableau de bord disparaissent ; les fichiers restent visibles
 * côté administration dans uploaded_documents.
 *
 * RLS côté client : les candidats ne peuvent pas mettre à jour applications
 * après paiement — mise à jour via service role après contrôle d'appartenance.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: app, error: fetchErr } = await admin
      .from('applications')
      .select(
        'applicant_id, application_status, payment_status, conditional_message, documents_submitted',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchErr || !app) {
      console.error('[confirm-supplementary] fetch:', fetchErr)
      return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 })
    }

    if (!app.documents_submitted) {
      return NextResponse.json(
        {
          error:
            'Vous devez d\'abord avoir soumis votre dossier documentaire initial avant de confirmer des pièces complémentaires.',
        },
        { status: 400 },
      )
    }

    if (!app.conditional_message?.trim()) {
      return NextResponse.json(
        { error: 'Aucune demande de pièce complémentaire en attente de confirmation.' },
        { status: 400 },
      )
    }

    const { data: rows, error: updErr } = await admin
      .from('applications')
      .update({
        conditional_message: null,
        updated_at:          new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('applicant_id', app.applicant_id)
      .select('applicant_id')

    if (updErr || !rows?.length) {
      console.error('[confirm-supplementary] update:', updErr)
      return NextResponse.json(
        {
          error:   'Impossible d\'enregistrer la confirmation.',
          details: updErr?.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[confirm-supplementary] unexpected:', err)
    return NextResponse.json({ error: 'Erreur serveur inattendue.' }, { status: 500 })
  }
}
