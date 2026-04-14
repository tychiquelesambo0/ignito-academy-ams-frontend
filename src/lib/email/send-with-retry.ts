/**
 * Email sender with exponential-backoff retry logic.
 * Uses the Resend SDK. Logs every attempt to the `email_logs` table.
 *
 * Requirements: 21.2 – 21.4
 */

import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmailType =
  | 'payment_confirmation'
  | 'conditional_acceptance'
  | 'final_acceptance'
  | 'refusal'

export interface SendEmailOptions {
  /** Recipient email address */
  to:           string
  subject:      string
  html:         string
  applicantId:  string
  emailType:    EmailType
  /** Maximum number of attempts (default 3) */
  maxRetries?:  number
  /** Optional PDF attachment */
  attachment?: { filename: string; content: Buffer | Uint8Array }
}

export interface SendEmailResult {
  success:     boolean
  messageId?:  string
  retryCount:  number
  error?:      string
  /** True when the send was skipped due to missing/mock RESEND_API_KEY */
  wasMock?:    boolean
}

// ─── Utility: sleep ───────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// ─── Main function ────────────────────────────────────────────────────────────

export async function sendEmailWithRetry(opts: SendEmailOptions): Promise<SendEmailResult> {
  const maxRetries  = opts.maxRetries ?? 3
  const fromEmail   = process.env.FROM_EMAIL?.trim() || 'Ignito Academy <admissions@ignitoacademy.com>'
  const resendKey   = process.env.RESEND_API_KEY

  // Initialise service-role Supabase client for logging (bypasses RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Create a pending log entry before we attempt anything
  const { data: logRow } = await supabase
    .from('email_logs')
    .insert({
      applicant_id:    opts.applicantId,
      recipient_email: opts.to,
      subject:         opts.subject,
      email_type:      opts.emailType,
      status:          'pending',
      retry_count:     0,
    })
    .select('id')
    .single()

  const logId = logRow?.id as string | undefined

  // Dev/staging shortcut — no Resend key configured
  const isMockKey = !resendKey || resendKey === 'mock-resend-api-key' || resendKey.startsWith('mock-')
  if (isMockKey) {
    console.warn(`[email] RESEND_API_KEY not configured or is a mock key — skipping real send for ${opts.applicantId} (${opts.emailType}). Set a real RESEND_API_KEY to send emails.`)
    if (logId) {
      await supabase.from('email_logs').update({
        status:        'sent',
        retry_count:   0,
        sent_at:       new Date().toISOString(),
        error_message: 'MOCK_MODE: email not actually sent',
      }).eq('id', logId)
    }
    return { success: true, retryCount: 0, wasMock: true }
  }

  const resend = new Resend(resendKey)

  let lastError = ''

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const payload: Parameters<typeof resend.emails.send>[0] = {
        from:    fromEmail,
        to:      [opts.to],
        subject: opts.subject,
        html:    opts.html,
      }

      if (opts.attachment) {
        const bytes  = Buffer.isBuffer(opts.attachment.content)
          ? opts.attachment.content
          : Buffer.from(opts.attachment.content)
        payload.attachments = [{
          filename: opts.attachment.filename,
          content:  bytes,
        }]
      }

      const { data, error } = await resend.emails.send(payload)

      if (error) {
        lastError = error.message
        console.error(`[email] Attempt ${attempt}/${maxRetries} failed: ${error.message}`)
      } else {
        // Success
        if (logId) {
          await supabase.from('email_logs').update({
            status:      'sent',
            retry_count: attempt - 1,
            sent_at:     new Date().toISOString(),
          }).eq('id', logId)
        }
        return { success: true, messageId: data?.id, retryCount: attempt - 1 }
      }
    } catch (e) {
      lastError = String(e)
      console.error(`[email] Attempt ${attempt}/${maxRetries} threw:`, e)
    }

    // Update retry_count after each failed attempt
    if (logId) {
      await supabase.from('email_logs').update({ retry_count: attempt }).eq('id', logId)
    }

    if (attempt < maxRetries) {
      // Exponential backoff: 1 s, 2 s, 4 s …
      await sleep(Math.pow(2, attempt - 1) * 1000)
    }
  }

  // All attempts exhausted
  if (logId) {
    await supabase.from('email_logs').update({
      status:        'failed',
      retry_count:   maxRetries,
      error_message: lastError,
    }).eq('id', logId)
  }

  return { success: false, retryCount: maxRetries, error: lastError }
}
