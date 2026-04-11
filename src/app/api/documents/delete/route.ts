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

    // Use admin client for lookups — ownership is enforced by .eq('user_id') filters
    const admin = createAdminClient()

    // Fetch the record first to verify ownership and get the storage path
    const { data: doc, error: fetchError } = await admin
      .from('uploaded_documents')
      .select('id, file_path, user_id, applicant_id')
      .eq('id', documentId)
      .eq('user_id', user.id) // ownership check
      .single()

    if (fetchError || !doc) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    // Lock deletes once payment is confirmed — UNLESS admin has re-opened the
    // window via Admission sous réserve status.
    const { data: application } = await admin
      .from('applications')
      .select('payment_status, application_status')
      .eq('applicant_id', doc.applicant_id)
      .single()

    const isConditional = application?.application_status === 'Admission sous réserve'
    if (
      !isConditional &&
      (application?.payment_status === 'Confirmed' || application?.payment_status === 'paid')
    ) {
      return NextResponse.json(
        { error: 'Les documents sont verrouillés après confirmation du paiement.' },
        { status: 403 }
      )
    }

    // Remove from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([doc.file_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue — still delete the DB record even if storage delete fails
    }

    // Delete DB record
    const { error: dbError } = await admin
      .from('uploaded_documents')
      .delete()
      .eq('id', documentId)

    if (dbError) {
      console.error('DB delete error:', dbError)
      return NextResponse.json({ error: 'Erreur lors de la suppression du document' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json({ error: "Une erreur inattendue s'est produite" }, { status: 500 })
  }
}
