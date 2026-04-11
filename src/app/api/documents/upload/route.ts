import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 5242880 // 5MB
const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const VALID_DOCUMENT_TYPES = [
  'identification',
  'diploma',
  'bulletin_10',
  'bulletin_11',
  'bulletin_12',
  'document_conditionnel',
] as const

type DocumentType = (typeof VALID_DOCUMENT_TYPES)[number]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const applicantId = formData.get('applicantId') as string
    const documentType = formData.get('documentType') as string

    if (!file || !applicantId) {
      return NextResponse.json(
        { error: 'Fichier et identifiant de candidature requis' },
        { status: 400 }
      )
    }

    if (!documentType || !VALID_DOCUMENT_TYPES.includes(documentType as DocumentType)) {
      return NextResponse.json(
        { error: 'Type de document invalide ou manquant' },
        { status: 400 }
      )
    }

    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté' },
        { status: 401 }
      )
    }

    // Verify application exists and belongs to the authenticated user.
    // Use admin client to bypass RLS — ownership is enforced by the .eq('user_id') filter.
    const admin = createAdminClient()
    const { data: application, error: appError } = await admin
      .from('applications')
      .select('applicant_id, payment_status, application_status, intake_year')
      .eq('applicant_id', applicantId)
      .eq('user_id', user.id)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Dossier de candidature introuvable' },
        { status: 404 }
      )
    }

    // Lock uploads once payment is confirmed — UNLESS the admin has set the
    // status to Admission sous réserve, which re-opens the upload window.
    const isConditional = application.application_status === 'Admission sous réserve'
    if (
      !isConditional &&
      (application.payment_status === 'Confirmed' || application.payment_status === 'paid')
    ) {
      return NextResponse.json(
        { error: 'Les documents sont verrouillés après confirmation du paiement.' },
        { status: 403 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux. Taille maximale: 5 MB' },
        { status: 400 }
      )
    }

    // Validate MIME type
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non accepté. Types acceptés: PDF, JPG, PNG' },
        { status: 400 }
      )
    }

    // For the 5 standard types: replace any existing file for this slot.
    // For 'document_conditionnel': allow multiple files to accumulate across
    // different conditional-admission rounds — do NOT auto-replace.
    if (documentType !== 'document_conditionnel') {
      const { data: existingDoc } = await supabase
        .from('uploaded_documents')
        .select('id, file_path')
        .eq('applicant_id', applicantId)
        .eq('document_type', documentType)
        .maybeSingle()

      if (existingDoc) {
        await supabase.storage.from('documents').remove([existingDoc.file_path])
        await supabase.from('uploaded_documents').delete().eq('id', existingDoc.id)
      }
    }

    // Generate unique file path: pieces_justificatives/[year]/[applicant_id]/[type]_[timestamp]_[filename]
    const timestamp = Date.now()
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueFilename = `${documentType}_${timestamp}_${sanitizedFilename}`
    const filePath = `pieces_justificatives/${application.intake_year}/${applicantId}/${uniqueFilename}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        {
          error: 'Erreur lors du téléchargement du fichier',
          details: uploadError.message || 'Erreur de stockage inconnue',
          code: uploadError.statusCode || 'STORAGE_ERROR',
        },
        { status: 500 }
      )
    }

    // Insert record into uploaded_documents table
    const { data: documentRecord, error: dbError } = await supabase
      .from('uploaded_documents')
      .insert({
        applicant_id: applicantId,
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size_bytes: file.size,
        mime_type: file.type,
        document_type: documentType,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      await supabase.storage.from('documents').remove([filePath])
      return NextResponse.json(
        {
          error: "Erreur lors de l'enregistrement du document",
          details: dbError.message || 'Erreur de base de données inconnue',
          code: dbError.code || 'DB_ERROR',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      document: {
        id: documentRecord.id,
        fileName: documentRecord.file_name,
        fileSizeBytes: documentRecord.file_size_bytes,
        mimeType: documentRecord.mime_type,
        uploadedAt: documentRecord.uploaded_at,
        documentType: documentRecord.document_type,
      },
    })
  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json(
      { error: "Une erreur inattendue s'est produite" },
      { status: 500 }
    )
  }
}
