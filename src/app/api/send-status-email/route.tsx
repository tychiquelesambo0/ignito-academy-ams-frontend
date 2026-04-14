/**
 * POST /api/send-status-email
 *
 * Sends a branded French email to an applicant whenever an admin changes
 * their application status.
 *
 * Rewritten to be bulletproof:
 *  - No React / @react-email/render (pure HTML template string)
 *  - Admin client used for all DB lookups (no RLS issues)
 *  - Direct applicants table lookup (no FK join)
 *  - Direct Resend SDK call (no retry wrapper overhead)
 */

import { NextRequest, NextResponse } from 'next/server'
import { Resend }                    from 'resend'
import { createAdminClient, createClient } from '@/lib/supabase/server'

// ─── Types ─────────────────────────────────────────────────────────────────

type EmailableStatus =
  | 'en_cours_devaluation'
  | 'Admission sous réserve'
  | 'Admission définitive'
  | 'Dossier refusé'

const EMAILABLE_STATUSES: EmailableStatus[] = [
  'en_cours_devaluation',
  'Admission sous réserve',
  'Admission définitive',
  'Dossier refusé',
]

// ─── Email builder (pure HTML — no React dependency) ────────────────────────

function buildEmail(
  status: EmailableStatus,
  applicantName: string,
  applicantId: string,
  dashboardUrl: string,
  conditionalMessage?: string,
): { subject: string; html: string } {

  const subjectMap: Record<EmailableStatus, string> = {
    'en_cours_devaluation':  `Ignito Academy : Votre dossier ${applicantId} est en cours d'évaluation`,
    'Admission sous réserve': `Mise à jour importante : Offre d'Admission Sous Réserve (${applicantId})`,
    'Admission définitive':   `FÉLICITATIONS : Vous êtes admis(e) à Ignito Academy (${applicantId})`,
    'Dossier refusé':         `Mise à jour concernant votre candidature à Ignito Academy (${applicantId})`,
  }

  type Content = { eyebrow: string; heading: string; body: string; highlight?: { text: string; bg: string; border: string; color: string }; cta: string }

  const contentMap: Record<EmailableStatus, Content> = {
    'en_cours_devaluation': {
      eyebrow:   'Confirmation de candidature',
      heading:   "Votre dossier est en cours d'évaluation",
      body:      `Cher/Chère ${applicantName}, nous confirmons la réception de votre candidature et de votre paiement. Votre dossier est désormais entre les mains de notre Comité des Admissions. Nous vous contacterons dès qu'une décision aura été prise.`,
      highlight: { text: "Dossier reçu · Paiement confirmé · En cours d\u2019évaluation", bg: '#F0FDF4', border: '#10B981', color: '#065f46' },
      cta:       'Suivre mon dossier',
    },
    'Admission sous réserve': {
      eyebrow:   "Décision d'admission",
      heading:   "Offre d'Admission Sous Réserve",
      body:      `Cher/Chère ${applicantName}, le Comité des Admissions a le plaisir de vous faire une offre d'admission sous réserve. Veuillez vous connecter immédiatement à votre portail Admitta pour consulter les conditions requises et télécharger les documents manquants.`,
      highlight: {
        text:   conditionalMessage ?? 'Des documents complémentaires vous sont demandés. Connectez-vous à votre portail pour les détails.',
        bg:     '#FFFBEB', border: '#F59E0B', color: '#78350f',
      },
      cta: 'Voir les conditions',
    },
    'Admission définitive': {
      eyebrow:   "Décision d'admission",
      heading:   'Félicitations — Vous êtes admis(e)!',
      body:      `Cher/Chère ${applicantName}, c'est avec un immense plaisir que nous vous annonçons votre admission définitive à Ignito Academy. Votre lettre d'admission officielle est disponible au téléchargement sur votre portail.`,
      highlight: { text: 'Vous êtes officiellement admis(e) — Promotion Septembre 2026', bg: '#F0FDF4', border: '#10B981', color: '#065f46' },
      cta:       "Télécharger ma lettre d'admission",
    },
    'Dossier refusé': {
      eyebrow:   "Mise à jour de votre candidature",
      heading:   'Information concernant votre dossier',
      body:      `Cher/Chère ${applicantName}, nous vous remercions de l'intérêt que vous portez à Ignito Academy. Après une étude attentive de votre dossier, nous ne pouvons malheureusement pas vous offrir de place pour cette rentrée. Veuillez consulter votre portail pour télécharger la lettre officielle.`,
      cta:       'Accéder à mon portail',
    },
  }

  const c = contentMap[status]

  const highlightBlock = c.highlight ? `
    <div style="background:${c.highlight.bg};border:1px solid ${c.highlight.border};border-left:4px solid ${c.highlight.border};border-radius:6px;padding:14px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;font-weight:bold;color:${c.highlight.color};line-height:1.6;">${c.highlight.text}</p>
    </div>` : ''

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${c.heading}</title>
</head>
<body style="background:#F8FAFC;margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;">
  <div style="padding:40px 0;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #E2E8F0;">

      <!-- Header -->
      <div style="background:#021463;padding:28px 40px 24px;">
        <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:0.5px;">IGNITO ACADEMY</p>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.55);font-size:11px;letter-spacing:1px;text-transform:uppercase;">Bureau des Admissions — Portail Admitta</p>
      </div>

      <!-- Body -->
      <div style="padding:36px 40px 28px;">

        <p style="margin:0 0 6px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">${c.eyebrow}</p>
        <p style="margin:0 0 24px;font-size:24px;color:#021463;font-family:Georgia,serif;line-height:1.3;">${c.heading}</p>

        <!-- Applicant ID box -->
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-left:4px solid #4EA6F5;border-radius:6px;padding:14px 20px;margin-bottom:24px;">
          <p style="margin:0;font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Identifiant de candidature</p>
          <p style="margin:4px 0 0;font-size:18px;font-weight:bold;color:#021463;font-family:monospace;">${applicantId}</p>
        </div>

        <!-- Body paragraph -->
        <p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.8;">${c.body}</p>

        ${highlightBlock}

        <!-- CTA Button -->
        <div style="text-align:center;margin:28px 0;">
          <a href="${dashboardUrl}" style="background:#021463;color:#ffffff;padding:14px 28px;border-radius:6px;font-weight:bold;font-size:14px;text-decoration:none;display:inline-block;">${c.cta}</a>
        </div>

        <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;">

        <!-- Sign-off -->
        <p style="margin:0;font-size:13px;color:#334155;line-height:1.8;font-family:Georgia,serif;">
          Veuillez agréer, Madame / Monsieur, l'expression de nos salutations académiques distinguées.<br><br>
          <strong>Tychique Lesambo</strong><br>
          <span style="color:#64748b;font-family:Arial,sans-serif;font-size:12px;">Directeur Académique — Ignito Academy</span>
        </p>
      </div>

      <!-- Footer -->
      <div style="background:#F1F5F9;border-top:1px solid #E2E8F0;padding:20px 40px;">
        <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;line-height:1.6;">
          &copy; 2026 Ignito Academy. Tous droits réservés.<br>
          Kinshasa, République Démocratique du Congo<br>
          <span style="color:#cbd5e1;">Ce message est généré automatiquement — veuillez ne pas y répondre.</span>
        </p>
      </div>

    </div>
  </div>
</body>
</html>`

  return { subject: subjectMap[status], html }
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { applicant_id, new_status, conditional_message } = body as {
      applicant_id?: string
      new_status?: string
      conditional_message?: string
    }

    // 1. Basic validation
    if (!applicant_id || !new_status) {
      return NextResponse.json({ error: 'applicant_id et new_status sont requis.' }, { status: 400 })
    }

    // 2. Skip statuses without a template
    if (!(EMAILABLE_STATUSES as string[]).includes(new_status)) {
      return NextResponse.json({ skipped: true, reason: 'Statut sans template email.' })
    }

    const status = new_status as EmailableStatus

    // 3. Verify caller is an authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[send-status-email] auth error:', authError?.message)
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }

    // 4. Verify caller is an active admissions officer (use admin client to bypass RLS)
    const adminDb = createAdminClient()

    const { data: officer, error: officerErr } = await adminDb
      .from('admissions_officers')
      .select('id')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (officerErr || !officer) {
      console.error('[send-status-email] officer check failed for', user.id, officerErr?.message)
      return NextResponse.json({ error: 'Accès réservé au Bureau des Admissions.' }, { status: 403 })
    }

    // 5. Resolve applicant_id (formatted, e.g. IGN-2026-00008) → user_id UUID
    //    because applicants.id is a UUID, not the formatted applicant_id string
    const { data: appRow, error: appErr } = await adminDb
      .from('applications')
      .select('user_id')
      .eq('applicant_id', applicant_id)
      .single()

    if (appErr || !appRow) {
      console.error('[send-status-email] application lookup failed for', applicant_id, appErr?.message)
      return NextResponse.json({ error: `Dossier introuvable : ${applicant_id}` }, { status: 404 })
    }

    // 6. Fetch applicant details using the UUID
    const { data: applicant, error: aptErr } = await adminDb
      .from('applicants')
      .select('prenom, nom, email')
      .eq('id', appRow.user_id)
      .single()

    if (aptErr || !applicant) {
      console.error('[send-status-email] applicant lookup failed for user_id', appRow.user_id, aptErr?.message)
      return NextResponse.json({ error: `Profil candidat introuvable pour ${applicant_id}` }, { status: 404 })
    }

    const name         = `${applicant.prenom} ${applicant.nom}`
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://admissions.ignitoacademy.com'}/dashboard`

    // 7. Build HTML email (no React rendering — pure template string)
    const { subject, html } = buildEmail(status, name, applicant_id, dashboardUrl, conditional_message)

    console.log(`[send-status-email] built email for ${applicant.email}, status=${status}, subject="${subject}"`)

    // 8. Check for mock mode
    const resendKey = process.env.RESEND_API_KEY
    const isMock = !resendKey || resendKey.startsWith('mock-') || resendKey === 'your-resend-api-key'

    if (isMock) {
      console.warn('[send-status-email] MOCK MODE — set a real RESEND_API_KEY in Vercel to send real emails')
      return NextResponse.json({ success: true, wasMock: true, recipient: applicant.email })
    }

    // 9. Send via Resend
    const resend    = new Resend(resendKey)
    const fromEmail = process.env.FROM_EMAIL?.trim() || 'Ignito Academy <admin@ignitoacademy.com>'

    console.log(`[send-status-email] calling resend.emails.send from="${fromEmail}" to="${applicant.email}"`)

    const { data: sendData, error: sendErr } = await resend.emails.send({
      from:    fromEmail,
      to:      [applicant.email],
      subject,
      html,
    })

    if (sendErr) {
      console.error('[send-status-email] Resend error:', sendErr)
      return NextResponse.json(
        { error: sendErr.message, recipient: applicant.email },
        { status: 500 },
      )
    }

    console.log(`[send-status-email] sent successfully, messageId=${sendData?.id}`)

    return NextResponse.json({
      success:   true,
      messageId: sendData?.id,
      wasMock:   false,
      recipient: applicant.email,
    })

  } catch (err) {
    console.error('[send-status-email] unexpected error:', err)
    return NextResponse.json(
      { error: `Erreur interne : ${String(err)}` },
      { status: 500 },
    )
  }
}
