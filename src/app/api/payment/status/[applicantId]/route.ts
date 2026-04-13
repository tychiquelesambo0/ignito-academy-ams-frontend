/**
 * GET /api/payment/status/[applicantId]
 *
 * Called by the payment page's polling loop every 3 seconds while in
 * "awaiting" state.
 *
 * Strategy (active reconciliation):
 *  1. Read payment_status from our DB.
 *  2. If already Confirmed or Waived → return immediately.
 *  3. If still Pending AND we have a transaction_id AND we're in PawaPay mode:
 *     → call PawaPay's GET /deposits/{depositId} to check the live status.
 *     → if COMPLETED → update DB to Confirmed + return Confirmed (self-healing).
 *     → if FAILED    → update DB to Failed    + return Failed.
 *  4. Otherwise return whatever the DB says.
 *
 * This makes the frontend work correctly even when the PawaPay webhook
 * hits a different environment (e.g. production webhook while testing locally).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getPaymentProvider } from '@/lib/payment'

export async function GET(
  _request: NextRequest,
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

    // ── Auth ─────────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Vous devez être connecté' }, { status: 401 })
    }

    const admin = createAdminClient()

    // ── DB lookup ─────────────────────────────────────────────────────────────
    const { data: application, error } = await admin
      .from('applications')
      .select('payment_status, application_status, applicant_id, transaction_id')
      .eq('applicant_id', applicantId)
      .eq('user_id', user.id)
      .single()

    if (error || !application) {
      return NextResponse.json(
        { error: 'Dossier de candidature introuvable' },
        { status: 404 }
      )
    }

    const { payment_status, transaction_id } = application

    // ── Already in a final state → return immediately ─────────────────────────
    if (payment_status === 'Confirmed' || payment_status === 'Waived') {
      return NextResponse.json({
        applicantId: application.applicant_id,
        paymentStatus: payment_status,
        applicationStatus: application.application_status,
      })
    }

    // ── Still Pending → actively query PawaPay if we have a transaction ID ───
    if (payment_status === 'Pending' && transaction_id) {
      try {
        const provider = await getPaymentProvider()
        const isMock = provider.name === 'Mock Payment Provider'

        if (!isMock) {
          const liveStatus = await provider.checkPaymentStatus(transaction_id)

          if (liveStatus.success && liveStatus.status === 'Confirmed') {
            // PawaPay says COMPLETED — update DB and return success
            await admin
              .from('applications')
              .update({
                payment_status: 'Confirmed',
                payment_confirmed_at: new Date().toISOString(),
              })
              .eq('applicant_id', applicantId)

            console.log(`[payment/status] ✅ Reconciled Confirmed for ${applicantId} via PawaPay direct check`)

            return NextResponse.json({
              applicantId: application.applicant_id,
              paymentStatus: 'Confirmed',
              applicationStatus: application.application_status,
            })
          }

          if (liveStatus.success && liveStatus.status === 'Failed') {
            // PawaPay says FAILED — update DB and return failure
            await admin
              .from('applications')
              .update({ payment_status: 'Failed' })
              .eq('applicant_id', applicantId)

            console.log(`[payment/status] ❌ Reconciled Failed for ${applicantId} via PawaPay direct check`)

            return NextResponse.json({
              applicantId: application.applicant_id,
              paymentStatus: 'Failed',
              applicationStatus: application.application_status,
            })
          }
        }
      } catch (providerErr) {
        // PawaPay check failed — log and fall through to return DB status
        console.warn('[payment/status] PawaPay direct check failed (non-fatal):', providerErr)
      }
    }

    // ── Default: return whatever is in the DB ─────────────────────────────────
    return NextResponse.json({
      applicantId: application.applicant_id,
      paymentStatus: payment_status,
      applicationStatus: application.application_status,
    })
  } catch (error) {
    console.error('[payment/status] Unexpected error:', error)
    return NextResponse.json(
      { error: "Une erreur inattendue s'est produite" },
      { status: 500 }
    )
  }
}
