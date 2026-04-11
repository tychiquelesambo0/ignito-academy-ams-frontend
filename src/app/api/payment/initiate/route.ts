import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmailWithRetry } from '@/lib/email/send-with-retry'
import { paymentConfirmationEmail } from '@/lib/email/templates'

interface PaymentInitiationRequest {
  applicantId: string
  provider: 'M-Pesa' | 'Orange Money' | 'Airtel Money'
}

interface NombaPaymentResponse {
  status: string
  data?: {
    payment_url?: string
    reference?: string
  }
  message?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentInitiationRequest = await request.json()
    const { applicantId, provider } = body

    // Validate input
    if (!applicantId || !provider) {
      return NextResponse.json(
        { error: 'Identifiant de candidature et mode de paiement requis' },
        { status: 400 }
      )
    }

    // Get Nomba API key from environment
    const nombaApiKey = process.env.NOMBA_API_KEY
    const isPlaceholderKey = !nombaApiKey || nombaApiKey.startsWith('mock-') || nombaApiKey === 'your-nomba-api-key'
    const useMockPayment = isPlaceholderKey || process.env.USE_MOCK_PAYMENT === 'true'
    
    console.log('Payment mode check:', {
      nombaApiKey: nombaApiKey ? 'SET' : 'NOT SET',
      USE_MOCK_PAYMENT: process.env.USE_MOCK_PAYMENT,
      useMockPayment
    })
    
    if (useMockPayment) {
      console.log('🔧 Using MOCK payment mode (Nomba API key not configured)')
    } else {
      console.log('💳 Using REAL payment mode (Nomba API key configured)')
    }

    // Get callback URL from environment or construct it
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const callbackUrl = `${baseUrl}/api/payment/webhook`

    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour effectuer un paiement' },
        { status: 401 }
      )
    }

    // Verify application exists and belongs to user
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('applicant_id, payment_status')
      .eq('applicant_id', applicantId)
      .eq('user_id', user.id)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Dossier de candidature introuvable' },
        { status: 404 }
      )
    }

    // Check if payment already confirmed (accept both legacy 'Confirmed' and new 'paid')
    if (application.payment_status === 'Confirmed' || application.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Le paiement a déjà été confirmé pour ce dossier' },
        { status: 400 }
      )
    }

    // MOCK PAYMENT MODE - Simulate successful payment
    if (useMockPayment) {
      console.log(`💰 MOCK: Simulating payment for ${applicantId} via ${provider}`)

      // Use service-role client to bypass RLS for this trusted server-side update
      const adminClient = createAdminClient()
      
      const { error: updateError } = await adminClient
        .from('applications')
        .update({
          payment_status: 'paid',
          application_status: 'en_cours_devaluation',
          payment_confirmed_at: new Date().toISOString(),
          transaction_id: `MOCK-${Date.now()}`,
        })
        .eq('applicant_id', applicantId)

      if (updateError) {
        console.error('Mock payment update error:', updateError)
        return NextResponse.json(
          { error: 'Erreur lors de la confirmation du paiement simulé' },
          { status: 500 }
        )
      }

      console.log(`✅ MOCK: Payment confirmed immediately for ${applicantId}`)

      // Fetch applicant profile for the confirmation email (applicants.id = user.id)
      const { data: profile } = await adminClient
        .from('applicants')
        .select('prenom, nom, email')
        .eq('id', user.id)
        .single()

      if (profile) {
        const { subject, html } = paymentConfirmationEmail({
          prenom:      profile.prenom,
          nom:         profile.nom,
          applicantId,
          amount:      '29 USD',
          date:        new Date().toISOString(),
        })
        // Fire-and-forget — don't block the payment response
        sendEmailWithRetry({
          to:          profile.email,
          subject,
          html,
          applicantId,
          emailType:   'payment_confirmation',
        }).catch(err => console.error('[email] Payment confirmation failed:', err))
      }

      return NextResponse.json({
        success: true,
        mock: true,
        message: 'Mode de paiement simulé - Paiement confirmé',
        reference: `MOCK-${applicantId}-${Date.now()}`,
      })
    }

    // REAL PAYMENT MODE - Call Nomba API
    const nombaPayload = {
      amount: 29.00,
      currency: 'USD',
      provider: provider,
      reference: applicantId,
      callback_url: callbackUrl,
      metadata: {
        user_id: user.id,
        applicant_id: applicantId,
      }
    }

    // Call Nomba API with 10-second timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const nombaResponse = await fetch('https://api.nomba.com/v1/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${nombaApiKey}`,
        },
        body: JSON.stringify(nombaPayload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!nombaResponse.ok) {
        const errorData = await nombaResponse.json().catch(() => ({}))
        console.error('Nomba API error:', errorData)
        return NextResponse.json(
          { error: 'Erreur lors de l\'initialisation du paiement. Veuillez réessayer.' },
          { status: 500 }
        )
      }

      const nombaData: NombaPaymentResponse = await nombaResponse.json()

      // Update application payment status to pending
      await supabase
        .from('applications')
        .update({ payment_status: 'Pending' })
        .eq('applicant_id', applicantId)

      // Return payment URL or data to client
      return NextResponse.json({
        success: true,
        paymentUrl: nombaData.data?.payment_url,
        reference: nombaData.data?.reference || applicantId,
      })

    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Le délai de connexion au service de paiement a expiré. Veuillez réessayer.' },
          { status: 504 }
        )
      }

      throw fetchError
    }

  } catch (error) {
    console.error('Payment initiation error:', error)
    return NextResponse.json(
      { error: 'Une erreur inattendue s\'est produite. Veuillez réessayer.' },
      { status: 500 }
    )
  }
}
