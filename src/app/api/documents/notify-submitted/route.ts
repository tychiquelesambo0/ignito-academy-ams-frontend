/**
 * POST /api/documents/notify-submitted
 *
 * Sends a "documents received" confirmation email to the applicant after
 * they first set documents_submitted = true.
 *
 * Called client-side (fire-and-forget) immediately after the Supabase update
 * in the dashboard documents page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Resend }                    from 'resend'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { documentsSubmittedEmail }   from '@/lib/email/templates'

export async function POST(req: NextRequest) {
  try {
    // 1. Verify the caller is an authenticated applicant
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    // 2. Fetch application + applicant details via admin client
    const admin = createAdminClient()

    const { data: appRow, error: appErr } = await admin
      .from('applications')
      .select('applicant_id, documents_submitted')
      .eq('user_id', user.id)
      .maybeSingle()

    if (appErr || !appRow) {
      return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 })
    }

    if (!appRow.documents_submitted) {
      // Guard: only send if documents are actually submitted
      return NextResponse.json({ skipped: true, reason: 'documents_submitted not set' })
    }

    const { data: applicant, error: aptErr } = await admin
      .from('applicants')
      .select('prenom, nom, email')
      .eq('id', user.id)
      .maybeSingle()

    if (aptErr || !applicant) {
      return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
    }

    // 3. Build email
    const { subject, html } = documentsSubmittedEmail({
      prenom:      applicant.prenom,
      nom:         applicant.nom,
      applicantId: appRow.applicant_id,
    })

    // 4. Mock mode check
    const resendKey = process.env.RESEND_API_KEY
    const isMock    = !resendKey || resendKey.startsWith('mock-') || resendKey === 'your-resend-api-key'

    if (isMock) {
      console.warn(`[notify-submitted] MOCK — would send "${subject}" to ${applicant.email}`)
      return NextResponse.json({ success: true, wasMock: true })
    }

    // 5. Send via Resend
    const resend    = new Resend(resendKey)
    const fromEmail = process.env.FROM_EMAIL?.trim() || 'Ignito Academy <noreply@ignitoacademy.com>'

    const { error: sendErr } = await resend.emails.send({
      from:    fromEmail,
      to:      [applicant.email],
      subject,
      html,
    })

    if (sendErr) {
      console.error('[notify-submitted] Resend error:', sendErr)
      return NextResponse.json({ error: sendErr.message }, { status: 500 })
    }

    console.log(`[notify-submitted] ✓ sent to ${applicant.email}`)
    return NextResponse.json({ success: true, wasMock: false })

  } catch (err) {
    console.error('[notify-submitted] unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
