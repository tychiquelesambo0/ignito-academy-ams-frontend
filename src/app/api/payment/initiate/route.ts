/**
 * POST /api/payment/initiate
 *
 * Initiates a mobile money payment via the PawaPay factory pattern.
 *
 * Body: { applicantId, provider, phoneNumber }
 *
 * Behaviour:
 *  - Mock provider  → immediately sets payment_status = 'Confirmed' in DB
 *                     and fires confirmation email, returns status: 'Confirmed'
 *  - PawaPay live   → sets payment_status = 'Pending' + stores transaction_id,
 *                     returns status: 'Pending' — UI then polls for confirmation
 *
 * Currency: 29 USD only (architectural pillar — NO CDF).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getPaymentProvider } from '@/lib/payment'
import { APPLICATION_FEE_USD } from '@/lib/payment/currency'
import { sendEmailWithRetry } from '@/lib/email/send-with-retry'
import { paymentConfirmationEmail } from '@/lib/email/templates'

interface PaymentInitiationRequest {
  applicantId: string
  provider: 'M-Pesa' | 'Orange Money' | 'Airtel Money'
  phoneNumber: string
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentInitiationRequest = await request.json()
    const { applicantId, provider, phoneNumber } = body

    // ── Input validation ───────────────────────────────────────────────────
    if (!applicantId || !provider || !phoneNumber) {
      return NextResponse.json(
        { error: 'Informations de paiement incomplètes (applicantId, provider, phoneNumber requis)' },
        { status: 400 },
      )
    }

    // ── Auth ───────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour effectuer un paiement' },
        { status: 401 },
      )
    }

    // Use admin client for all subsequent DB operations (bypasses RLS safely)
    const admin = createAdminClient()

    // ── Application lookup ─────────────────────────────────────────────────
    const { data: application, error: appError } = await admin
      .from('applications')
      .select('id, applicant_id, payment_status, documents_submitted, intake_year')
      .eq('applicant_id', applicantId)
      .eq('user_id', user.id)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Dossier de candidature introuvable' },
        { status: 404 },
      )
    }

    // ── Guard: documents must be submitted first ───────────────────────────
    if (!application.documents_submitted) {
      return NextResponse.json(
        { error: 'Veuillez soumettre vos documents avant de procéder au paiement' },
        { status: 400 },
      )
    }

    // ── Guard: idempotency — don't process already-confirmed payments ──────
    if (
      application.payment_status === 'Confirmed' ||
      application.payment_status === 'Waived'
    ) {
      return NextResponse.json(
        { error: 'Le paiement a déjà été confirmé pour ce dossier' },
        { status: 400 },
      )
    }

    // ── Applicant profile (for email + full name) ──────────────────────────
    const { data: profile } = await admin
      .from('applicants')
      .select('prenom, nom, email')
      .eq('id', user.id)
      .single()

    // ── Payment provider (factory: 'mock' or 'pawapay') ────────────────────
    const paymentProvider = await getPaymentProvider()
    const isMock     = paymentProvider.name === 'Mock Payment Provider'
    const isSandbox  = (process.env.PAWAPAY_BASE_URL ?? '').includes('sandbox')
    const activeMode = isMock ? 'simulation' : isSandbox ? 'sandbox' : 'production'

    console.log(`[payment/initiate] Mode: ${activeMode} | Provider: ${paymentProvider.name} | Applicant: ${applicantId}`)

    // ── Initiate payment ───────────────────────────────────────────────────
    const result = await paymentProvider.initiatePayment({
      applicationId: applicantId,
      userId: user.id,
      amountUsd: APPLICATION_FEE_USD,   // 29 USD — strictly enforced
      currency: 'USD',
      phoneNumber,
      email: profile?.email ?? '',
      fullName: profile ? `${profile.prenom} ${profile.nom}` : '',
      description: `Frais de dossier UK Level 3 Foundation Diploma — ${applicantId}`,
    })

    if (!result.success) {
      console.error('[payment/initiate] Provider error:', result.error)
      return NextResponse.json(
        { error: result.error || "Erreur lors de l'initialisation du paiement" },
        { status: 500 },
      )
    }

    // ── Persist result to DB ───────────────────────────────────────────────

    if (isMock || result.status === 'Confirmed') {
      // Mock / instant-confirm path: set Confirmed immediately
      const { error: updateError } = await admin
        .from('applications')
        .update({
          payment_status: 'Confirmed',
          transaction_id: result.transactionId ?? `MOCK-${Date.now()}`,
          payment_confirmed_at: new Date().toISOString(),
        })
        .eq('applicant_id', applicantId)

      if (updateError) {
        console.error('[payment/initiate] DB update error:', updateError)
        return NextResponse.json(
          { error: 'Erreur lors de la confirmation du paiement' },
          { status: 500 },
        )
      }

      // Confirmation email — fire and forget
      if (profile) {
        const { subject, html } = paymentConfirmationEmail({
          prenom: profile.prenom,
          nom: profile.nom,
          applicantId,
          amount: `${APPLICATION_FEE_USD} USD`,
          date: new Date().toISOString(),
        })
        sendEmailWithRetry({
          to: profile.email,
          subject,
          html,
          applicantId,
          emailType: 'payment_confirmation',
        }).catch((err) =>
          console.error('[email] Payment confirmation failed:', err),
        )
      }

      console.log(`[payment/initiate] ✅ Payment confirmed immediately for ${applicantId}`)

      return NextResponse.json({
        success: true,
        status: 'Confirmed',
        transactionId: result.transactionId,
        mode: activeMode,
      })
    } else {
      // PawaPay async path: store transaction_id, set Pending
      const { error: updateError } = await admin
        .from('applications')
        .update({
          transaction_id: result.transactionId,
          payment_status: 'Pending',
        })
        .eq('applicant_id', applicantId)

      if (updateError) {
        console.error('[payment/initiate] DB update error (pending):', updateError)
      }

      console.log(`[payment/initiate] ⏳ Payment pending for ${applicantId}, txId: ${result.transactionId}`)

      return NextResponse.json({
        success: true,
        status: 'Pending',
        transactionId: result.transactionId,
        mode: activeMode,
      })
    }
  } catch (error) {
    console.error('[payment/initiate] Unexpected error:', error)
    return NextResponse.json(
      { error: "Une erreur inattendue s'est produite. Veuillez réessayer." },
      { status: 500 },
    )
  }
}
