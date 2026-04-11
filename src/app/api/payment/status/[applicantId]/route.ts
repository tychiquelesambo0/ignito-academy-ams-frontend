import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { applicantId: string } }
) {
  try {
    const { applicantId } = params

    if (!applicantId) {
      return NextResponse.json(
        { error: 'Identifiant de candidature requis' },
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

    // Get application status
    const { data: application, error } = await supabase
      .from('applications')
      .select('payment_status, application_status, applicant_id')
      .eq('applicant_id', applicantId)
      .eq('user_id', user.id)
      .single()

    if (error || !application) {
      return NextResponse.json(
        { error: 'Dossier de candidature introuvable' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      applicantId: application.applicant_id,
      paymentStatus: application.payment_status,
      applicationStatus: application.application_status,
    })

  } catch (error) {
    console.error('Payment status check error:', error)
    return NextResponse.json(
      { error: 'Une erreur inattendue s\'est produite' },
      { status: 500 }
    )
  }
}
