import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  try {
    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: 'Identifiant du document requis' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Vous devez être connecté' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Fetch the record — enforce ownership via .eq('user_id')
    const { data: doc, error: fetchError } = await admin
      .from('uploaded_documents')
      .select('id, file_path, user_id, applicant_id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !doc) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    // Lock deletes once payment is confirmed — UNLESS admin re-opened via
    // "Admission sous réserve".
    const { data: application } = await admin
      .from('applications')
      .select('payment_status, application_status')
      .eq('applicant_id', doc.applicant_id)
      .single()

    const isConditional = application?.application_status === 'Admission sous réserve'
    if (
      !isConditional &&
      (application?.payment_status === 'Confirmed' || application?.payment_status === 'Waived')
    ) {
      return NextResponse.json(
        { error: 'Les documents sont verrouillés après confirmation du paiement.' },
        { status: 403 },
      )
    }

    // Remove from storage (admin client — same bucket fix: pieces_justificatives)
    const { error: storageError } = await admin.storage
      .from('pieces_justificatives')
      .remove([doc.file_path])

    if (storageError) {
      // Log but continue — still delete the DB record so the slot can be re-used
      console.error('[Documents/delete] storage error:', storageError)
    }

    // Delete DB record
    const { error: dbError } = await admin
      .from('uploaded_documents')
      .delete()
      .eq('id', documentId)

    if (dbError) {
      console.error('[Documents/delete] DB error:', dbError)
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du document.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Documents/delete] unexpected error:', error)
    return NextResponse.json(
      { error: "Une erreur inattendue s'est produite." },
      { status: 500 },
    )
  }
}
