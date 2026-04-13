/**
 * POST /api/webhooks/pawapay
 *
 * Receives deposit (and payout/refund) status callbacks from PawaPay.
 *
 * PawaPay calls this URL when the status of a deposit changes to a final state
 * (COMPLETED or FAILED). The URL is registered in the PawaPay dashboard under
 * System Configuration → Callback URLs.
 *
 * Rules enforced per PawaPay documentation:
 *  1. Always return HTTP 200 promptly — PawaPay retries for 15 min on non-200.
 *  2. Be idempotent — duplicate callbacks must not double-confirm.
 *  3. No authentication required on this endpoint (excluded from middleware).
 *
 * Signature verification:
 *  PawaPay does NOT provide a user-configured signing secret in the dashboard.
 *  If PAWAPAY_WEBHOOK_SECRET is set we verify HMAC-SHA256; otherwise we accept
 *  all requests and rely on the depositId lookup for integrity.
 *
 * DB lookup strategy:
 *  We match applications by `transaction_id = depositId` (the UUID we stored
 *  when initiating the payment). This is the most reliable link.
 *  As a fallback we check the `applicationId` field in the metadata array.
 *
 * Currency: 1 USD (testing) / 29 USD (production) — USD only, no CDF.
 */

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmailWithRetry } from '@/lib/email/send-with-retry'
import { paymentConfirmationEmail } from '@/lib/email/templates'

// ─── PawaPay callback payload types ───────────────────────────────────────────

interface PawaPayMetadataField {
  fieldName: string
  fieldValue: string
}

interface PawaPayDepositCallback {
  depositId:         string
  status:            'ACCEPTED' | 'SUBMITTED' | 'COMPLETED' | 'FAILED'
  amount:            string       // full decimal string, e.g. "1.00"
  currency:          string       // "USD"
  correspondent:     string       // "VODACOM_MPESA_COD" | "ORANGE_COD" | "AIRTEL_COD"
  payer?: {
    type:    string               // "MSISDN"
    address: { value: string }    // E.164 phone number
  }
  created?:           string      // ISO timestamp
  respondedByPayer?:  string      // ISO timestamp when customer approved/rejected
  failureReason?: {
    failureMessage: string
    failureCode:    string
  }
  metadata?: PawaPayMetadataField[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract a named field from PawaPay metadata array */
function getMetadataField(
  metadata: PawaPayMetadataField[] | undefined,
  fieldName: string,
): string | null {
  return metadata?.find((f) => f.fieldName === fieldName)?.fieldValue ?? null
}

/** Verify HMAC-SHA256 signature if a secret is configured */
function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    const hmac      = crypto.createHmac('sha256', secret)
    const expected  = hmac.update(rawBody).digest('hex')
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature.toLowerCase()),
      Buffer.from(expected.toLowerCase()),
    )
  } catch {
    return false
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rawBody  = await request.text()
  const received = new Date().toISOString()

  console.log('[webhook/pawapay] ▶ callback received', received)

  // ── 1. Signature verification (log-only — PawaPay uses JWT HTTP Signatures,
  //        not a user-configured HMAC secret. We log mismatches for forensics
  //        but NEVER reject the webhook based on this check, because rejecting
  //        silently (HTTP 200 without DB update) causes payments to get stuck.) ──
  const webhookSecret = process.env.PAWAPAY_WEBHOOK_SECRET
  if (webhookSecret) {
    const signature = request.headers.get('x-pawapay-signature') ?? ''
    if (signature && !verifySignature(rawBody, signature, webhookSecret)) {
      console.warn('[webhook/pawapay] ⚠ signature header present but did not match — processing anyway')
    } else if (signature) {
      console.log('[webhook/pawapay] ✓ signature verified')
    } else {
      console.log('[webhook/pawapay] ℹ no x-pawapay-signature header — PawaPay uses JWT signatures')
    }
  }

  // ── 2. Parse payload ────────────────────────────────────────────────────────
  let payload: PawaPayDepositCallback
  try {
    payload = JSON.parse(rawBody)
  } catch {
    console.error('[webhook/pawapay] ✗ invalid JSON body')
    return NextResponse.json({ received: true }, { status: 200 }) // always 200
  }

  const { depositId, status, amount, currency, metadata, failureReason } = payload

  console.log(`[webhook/pawapay] depositId=${depositId} status=${status} amount=${amount} ${currency}`)

  // We only care about final states
  if (status !== 'COMPLETED' && status !== 'FAILED') {
    console.log(`[webhook/pawapay] intermediate status "${status}" — nothing to do`)
    return NextResponse.json({ received: true }, { status: 200 })
  }

  // ── 3. Look up the application ──────────────────────────────────────────────
  const admin = createAdminClient()

  // Primary: match by transaction_id (the depositId we stored when initiating)
  let { data: application } = await admin
    .from('applications')
    .select('id, applicant_id, user_id, payment_status, transaction_id')
    .eq('transaction_id', depositId)
    .maybeSingle()

  // Fallback: check applicationId in metadata (the applicant_id we embedded)
  if (!application) {
    const applicantId = getMetadataField(metadata, 'applicationId')
    if (applicantId) {
      const result = await admin
        .from('applications')
        .select('id, applicant_id, user_id, payment_status, transaction_id')
        .eq('applicant_id', applicantId)
        .maybeSingle()
      application = result.data
    }
  }

  if (!application) {
    console.error(`[webhook/pawapay] ✗ no application found for depositId=${depositId}`)
    return NextResponse.json({ received: true }, { status: 200 })
  }

  // ── 4. Idempotency — skip if already in final state ─────────────────────────
  if (
    application.payment_status === 'Confirmed' ||
    application.payment_status === 'Waived'
  ) {
    console.log(`[webhook/pawapay] already ${application.payment_status} — skipping duplicate`)
    return NextResponse.json({ received: true }, { status: 200 })
  }

  // ── 5. Update payment status ────────────────────────────────────────────────
  if (status === 'COMPLETED') {
    const { error: updateError } = await admin
      .from('applications')
      .update({
        payment_status:       'Confirmed',
        transaction_id:       depositId,            // ensure it's stored
        payment_confirmed_at: received,
      })
      .eq('id', application.id)

    if (updateError) {
      console.error('[webhook/pawapay] ✗ DB update error (COMPLETED):', updateError)
      // Return 500 so PawaPay retries
      return NextResponse.json({ error: 'db_error' }, { status: 500 })
    }

    console.log(`[webhook/pawapay] ✓ payment_status → Confirmed for ${application.applicant_id}`)

    // ── 6. Send confirmation email (fire-and-forget) ──────────────────────────
    const { data: applicant } = await admin
      .from('applicants')
      .select('prenom, nom, email')
      .eq('id', application.user_id)
      .single()

    if (applicant) {
      const { subject, html } = paymentConfirmationEmail({
        prenom:      applicant.prenom,
        nom:         applicant.nom,
        applicantId: application.applicant_id,
        amount:      `${amount} ${currency}`,
        date:        received,
      })
      sendEmailWithRetry({
        to:          applicant.email,
        subject,
        html,
        applicantId: application.applicant_id,
        emailType:   'payment_confirmation',
      }).catch((err) => console.error('[webhook/pawapay] email error:', err))
    }

  } else if (status === 'FAILED') {
    const { error: updateError } = await admin
      .from('applications')
      .update({ payment_status: 'Failed' })
      .eq('id', application.id)

    if (updateError) {
      console.error('[webhook/pawapay] ✗ DB update error (FAILED):', updateError)
      return NextResponse.json({ error: 'db_error' }, { status: 500 })
    }

    console.log(
      `[webhook/pawapay] ✗ payment FAILED for ${application.applicant_id}`,
      failureReason?.failureCode,
      failureReason?.failureMessage,
    )
  }

  // ── 7. Log to webhook_logs (best-effort, don't fail if table missing) ────────
  await admin
    .from('webhook_logs')
    .insert({
      provider:     'pawapay',
      event_type:   'deposit_callback',
      payload:      payload,
      status:       status === 'COMPLETED' ? 'processed' : 'failed',
      processed_at: received,
    })
    .then(({ error }) => {
      if (error) console.warn('[webhook/pawapay] webhook_logs insert failed (non-fatal):', error.message)
    })

  console.log('[webhook/pawapay] ✓ done')
  return NextResponse.json({ received: true }, { status: 200 })
}

/** PawaPay only POSTs — respond to accidental GETs gracefully */
export async function GET() {
  return NextResponse.json({ status: 'pawapay webhook endpoint' }, { status: 200 })
}
