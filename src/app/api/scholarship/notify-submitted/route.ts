/**
 * POST /api/scholarship/notify-submitted
 *
 * Sends a confirmation email to an applicant after they submit their
 * scholarship video URL for the Bourse d'Excellence.
 *
 * Called client-side from /dashboard/scholarship after a successful DB update.
 * Requires an authenticated session (applicant only — no admin rights needed).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmailWithRetry } from '@/lib/email/send-with-retry'
import { scholarshipVideoSubmittedEmail } from '@/lib/email/templates'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { applicantId, videoUrl } = body as {
      applicantId?: string
      videoUrl?: string
    }

    if (!applicantId || !videoUrl) {
      return NextResponse.json(
        { error: 'applicantId et videoUrl sont requis.' },
        { status: 400 },
      )
    }

    // Verify the caller is an authenticated applicant
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Confirm the application belongs to this user
    const { data: app } = await admin
      .from('applications')
      .select('user_id')
      .eq('applicant_id', applicantId)
      .eq('user_id', user.id)
      .single()

    if (!app) {
      return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 })
    }

    // Fetch applicant profile for email
    const { data: profile } = await admin
      .from('applicants')
      .select('prenom, nom, email')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profil candidat introuvable.' }, { status: 404 })
    }

    const { subject, html } = scholarshipVideoSubmittedEmail({
      prenom:      profile.prenom,
      nom:         profile.nom,
      applicantId,
      videoUrl,
    })

    await sendEmailWithRetry({
      to:          profile.email,
      subject,
      html,
      applicantId,
      emailType:   'scholarship_video_submitted',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[scholarship/notify-submitted] unexpected error:', err)
    return NextResponse.json(
      { error: `Erreur interne : ${String(err)}` },
      { status: 500 },
    )
  }
}
