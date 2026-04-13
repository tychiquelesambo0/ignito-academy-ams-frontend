import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 5_242_880 // 5 MB
const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

// Must match the DB CHECK constraint on uploaded_documents.document_type
const VALID_DOCUMENT_TYPES = [
  'Bulletin 10ème',
  'Bulletin 11ème',
  'Bulletin 12ème',
  "Diplôme d'État",
  "Carte d'identité",
  "Photo d'identité",
  'Autre',
] as const

type DocumentType = (typeof VALID_DOCUMENT_TYPES)[number]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file         = formData.get('file')         as File
    const applicantId  = formData.get('applicantId')  as string
    const documentType = formData.get('documentType') as string

    if (!file || !applicantId) {
      return NextResponse.json(
        { error: 'Fichier et identifiant de candidature requis' },
        { status: 400 },
      )
    }

    if (!documentType || !VALID_DOCUMENT_TYPES.includes(documentType as DocumentType)) {
      return NextResponse.json(
        { error: `Type de document invalide. Types acceptés : ${VALID_DOCUMENT_TYPES.join(', ')}` },
        { status: 400 },
      )
    }

    // Verify the caller is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Vous devez être connecté' }, { status: 401 })
    }

    // Verify the application belongs to this user (admin client — ownership enforced below)
    const admin = createAdminClient()
    const { data: application, error: appError } = await admin
      .from('applications')
      .select('id, applicant_id, payment_status, application_status, intake_year')
      .eq('applicant_id', applicantId)
      .eq('user_id', user.id)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Dossier de candidature introuvable' },
        { status: 404 },
      )
    }

    // Documents are locked once payment is confirmed — UNLESS admin has re-opened
    // the window via "Admission sous réserve".
    const isConditional = application.application_status === 'Admission sous réserve'
    if (
      !isConditional &&
      (application.payment_status === 'Confirmed' || application.payment_status === 'Waived')
    ) {
      return NextResponse.json(
        { error: 'Les documents sont verrouillés après confirmation du paiement.' },
        { status: 403 },
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux. Taille maximale : 5 Mo.' },
        { status: 400 },
      )
    }

    // Validate MIME type — NO video uploads (architecture pillar)
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format non accepté. Utilisez PDF, JPG ou PNG.' },
        { status: 400 },
      )
    }

    // For all standard types: replace any existing file for this slot.
    const { data: existingDoc } = await admin
      .from('uploaded_documents')
      .select('id, file_path')
      .eq('applicant_id', applicantId)
      .eq('document_type', documentType)
      .maybeSingle()

    if (existingDoc) {
      await admin.storage.from('pieces_justificatives').remove([existingDoc.file_path])
      await admin.from('uploaded_documents').delete().eq('id', existingDoc.id)
    }

    // File path within the bucket:
    //   {intake_year}/{applicant_id}/{type}_{timestamp}_{sanitized_filename}
    // The storage RLS policy checks foldername[1]=year, foldername[2]=applicant_id.
    const timestamp        = Date.now()
    const sanitizedName    = file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')
    const typeSlug         = documentType.replace(/[^a-zA-Z0-9]/g, '_')
    const uniqueFilename   = `${typeSlug}_${timestamp}_${sanitizedName}`
    const filePath         = `${application.intake_year}/${applicantId}/${uniqueFilename}`

    // Upload to the correct bucket using the admin client to bypass storage RLS.
    // Auth + ownership are already fully validated above.
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await admin.storage
      .from('pieces_justificatives')
      .upload(filePath, Buffer.from(arrayBuffer), {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[Documents/upload] storage error:', uploadError)
      return NextResponse.json(
        {
          error: 'Erreur lors du téléchargement du fichier.',
          details: uploadError.message,
        },
        { status: 500 },
      )
    }

    // Insert metadata record
    const { data: documentRecord, error: dbError } = await admin
      .from('uploaded_documents')
      .insert({
        applicant_id:    applicantId,
        application_id:  application.id,
        user_id:         user.id,
        file_name:       file.name,
        file_path:       filePath,
        file_size_bytes: file.size,
        mime_type:       file.type,
        document_type:   documentType,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[Documents/upload] DB insert error:', dbError)
      // Roll back the storage upload
      await admin.storage.from('pieces_justificatives').remove([filePath])
      return NextResponse.json(
        {
          error: "Erreur lors de l'enregistrement du document.",
          details: dbError.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      document: {
        id:             documentRecord.id,
        fileName:       documentRecord.file_name,
        fileSizeBytes:  documentRecord.file_size_bytes,
        mimeType:       documentRecord.mime_type,
        uploadedAt:     documentRecord.uploaded_at,
        documentType:   documentRecord.document_type,
      },
    })
  } catch (error) {
    console.error('[Documents/upload] unexpected error:', error)
    return NextResponse.json(
      { error: "Une erreur inattendue s'est produite." },
      { status: 500 },
    )
  }
}
