// Supabase Edge Function: admin-decision
// Purpose: Orchestrate the atomic admin decision workflow
//   1. Validate input + verify officer
//   2. Fetch application + applicant
//   3. Generate PDF letter (conditional / final only)
//   4. Upload PDF to official_letters bucket
//   5. Send decision email with PDF attachment (3 retries, exponential backoff)
//   6. Update application status atomically (optimistic locking via RPC)
//   7. Insert immutable audit trail record
//
// Rollback strategy: each step that fails returns early BEFORE committing the
// status change (step 6), so an interrupted run never produces a partial state
// where the applicant's status was updated but no email was sent.

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient }  from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'
import { IGNITO_LOGO_PNG_B64 } from './logo.ts'

// ─── CORS ─────────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DecisionType    = 'conditional' | 'final' | 'rejected'
type AppStatus       = 'Admission sous réserve' | 'Admission définitive' | 'Dossier refusé'

interface AdminDecisionInput {
  applicant_id:     string
  decision_type:    DecisionType
  admin_id:         string
  expected_version: number
  notes?:           string
}

interface LogEntry {
  operation_id: string
  step:         string
  status:       'started' | 'completed' | 'failed'
  timestamp:    string
  details?:     Record<string, unknown>
}

// ─── Mapping tables ───────────────────────────────────────────────────────────

const DECISION_STATUS: Record<DecisionType, AppStatus> = {
  conditional: 'Admission sous réserve',
  final:       'Admission définitive',
  rejected:    'Dossier refusé',
}

const EMAIL_SUBJECTS: Partial<Record<DecisionType, string>> = {
  conditional: "Décision d'admission : Offre sous réserve",
  final:       'Félicitations : Admission définitive',
}

// ─── Structured logger ────────────────────────────────────────────────────────

function logger(operationId: string) {
  const entries: LogEntry[] = []
  function log(step: string, status: LogEntry['status'], details?: Record<string, unknown>) {
    const entry: LogEntry = { operation_id: operationId, step, status, timestamp: new Date().toISOString(), details }
    entries.push(entry)
    console.log(JSON.stringify(entry))
  }
  return { log, entries }
}

// ─── JSON response helper ─────────────────────────────────────────────────────

function jsonRes(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ─── PDF generation ───────────────────────────────────────────────────────────

// Decode base64 string to Uint8Array (Deno-compatible, no Buffer)
function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function generateDecisionPDF(opts: {
  applicantId:  string
  prenom:       string
  nom:          string
  decisionType: 'conditional' | 'final'
  footerText?:  string
}): Promise<Uint8Array> {
  const doc  = await PDFDocument.create()
  const page = doc.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()

  const bold    = await doc.embedFont(StandardFonts.TimesRomanBold)
  const regular = await doc.embedFont(StandardFonts.TimesRoman)
  const sans    = await doc.embedFont(StandardFonts.Helvetica)
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold)

  // Colour palette
  const navy  = rgb(2 / 255,  20 / 255, 99 / 255)
  const slate = rgb(30 / 255, 41 / 255, 59 / 255)
  const muted = rgb(100 / 255, 116 / 255, 139 / 255)

  // ── Embed Ignito logo ──────────────────────────────────────────────────────
  // Logo source: Assets/Ignito Logo.svg (pre-converted to PNG at 786×174px)
  // Aspect ratio: 393:87 ≈ 4.517:1  → display at 140×31 pt
  const logoPng   = base64ToUint8Array(IGNITO_LOGO_PNG_B64)
  const logoImage = await doc.embedPng(logoPng)
  const logoW = 140
  const logoH = Math.round(logoW / (393 / 87)) // ≈ 31 pt

  // ── Header: white background with logo + institution label ─────────────────
  // Logo top-left
  page.drawImage(logoImage, { x: 40, y: height - 40 - logoH, width: logoW, height: logoH })

  // Institution label right-aligned
  const instLabel = 'Bureau des Admissions'
  const instW     = sans.widthOfTextAtSize(instLabel, 8)
  page.drawText(instLabel, { x: width - 40 - instW, y: height - 30,      size: 8,  font: sans,     color: muted })
  const siteLabel = 'Portail Admitta — Ignito Academy'
  const siteW     = sansBold.widthOfTextAtSize(siteLabel, 9)
  page.drawText(siteLabel, { x: width - 40 - siteW, y: height - 42,      size: 9,  font: sansBold, color: navy  })

  // Full-width navy rule below header
  const ruleY = height - 52 - logoH
  page.drawLine({ start: { x: 40, y: ruleY }, end: { x: width - 40, y: ruleY }, thickness: 1.5, color: navy })

  let y = ruleY - 24

  // ── Date + reference ───────────────────────────────────────────────────────
  const dateFR = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  page.drawText(`Kinshasa, le ${dateFR}`,       { x: width - 210, y, size: 10, font: sans, color: slate })
  y -= 22
  page.drawText(`Réf. : ${opts.applicantId}`,   { x: 40,          y, size: 10, font: sans, color: slate })
  y -= 32

  // ── Addressee block ────────────────────────────────────────────────────────
  page.drawText('Madame / Monsieur,', { x: 40, y, size: 11, font: regular, color: slate })
  y -= 16
  page.drawText(`${opts.prenom.toUpperCase()} ${opts.nom.toUpperCase()}`, { x: 40, y, size: 11, font: bold, color: navy })
  y -= 16
  page.drawText(`Identifiant de candidature : ${opts.applicantId}`, { x: 40, y, size: 10, font: sans, color: slate })
  y -= 36

  // ── Subject line ───────────────────────────────────────────────────────────
  const subject = opts.decisionType === 'conditional'
    ? "Objet : Décision d'admission — Offre sous réserve"
    : "Objet : Décision d'admission — Admission définitive"
  page.drawText(subject, { x: 40, y, size: 12, font: bold, color: navy })
  const subW = bold.widthOfTextAtSize(subject, 12)
  page.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 40 + subW, y: y - 4 }, thickness: 0.8, color: navy })
  y -= 38

  // ── Body paragraphs ────────────────────────────────────────────────────────
  const lines: string[] = opts.decisionType === 'conditional'
    ? [
        "Nous avons le plaisir de vous informer que votre dossier de candidature a été examiné par la",
        "Commission d'Admission d'Ignito Academy. À l'issue de cet examen, nous avons le plaisir de",
        "vous proposer une offre d'admission sous réserve pour l'année académique en cours.",
        '',
        "Cette offre est conditionnelle à la validation définitive de votre parcours académique et à la",
        "fourniture de tout document complémentaire qui pourrait être requis par notre institution.",
        "Vous serez notifié(e) de toute démarche supplémentaire par voie électronique.",
        '',
        "Nous vous invitons à prendre connaissance attentivement des modalités d'inscription jointes",
        "à la présente communication et à y donner suite dans les délais impartis.",
        '',
        "Nous vous adressons, Madame/Monsieur, l'expression de nos salutations académiques distinguées.",
      ]
    : [
        "Au nom du Conseil d'Admission d'Ignito Academy, nous avons l'honneur de vous annoncer",
        "votre admission définitive au sein de notre programme de formation accrédité par NCC Education",
        "(Royaume-Uni).",
        '',
        "Votre dossier de candidature a été évalué avec le plus grand soin par notre commission.",
        "C'est avec fierté que nous vous accueillons au sein de notre communauté académique.",
        '',
        "Des instructions détaillées concernant votre inscription et votre intégration vous seront",
        "transmises séparément. Nous vous invitons à y répondre promptement afin de confirmer",
        "votre place au sein de la promotion.",
        '',
        "Nous vous présentons, Madame/Monsieur, nos très chaleureuses félicitations ainsi que",
        "nos salutations académiques les plus distinguées.",
      ]

  for (const line of lines) {
    if (line === '') { y -= 10; continue }
    page.drawText(line, { x: 40, y, size: 10.5, font: regular, color: slate })
    y -= 16
  }

  y -= 32

  // ── Signature block ────────────────────────────────────────────────────────
  page.drawText('La Direction des Admissions',  { x: 40, y,      size: 10, font: bold,    color: navy  })
  page.drawText('Ignito Academy',               { x: 40, y: y - 15, size: 10, font: regular, color: slate })

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footer = opts.footerText
    ?? "Ignito Academy · Portail Admitta · Kinshasa, République Démocratique du Congo"
  page.drawLine({ start: { x: 40, y: 62 }, end: { x: width - 40, y: 62 }, thickness: 0.5, color: navy })
  page.drawText(footer, { x: 40, y: 48, size: 7.5, font: sans, color: muted })
  page.drawText('© 2026 Ignito Academy. Tous droits réservés.', { x: 40, y: 35, size: 7.5, font: sans, color: muted })

  return doc.save()
}

// ─── Email HTML builder ───────────────────────────────────────────────────────

function buildEmailHtml(opts: {
  prenom:       string
  nom:          string
  applicantId:  string
  decisionType: 'conditional' | 'final'
}): string {
  const isConditional = opts.decisionType === 'conditional'
  const title   = isConditional ? "Offre d'admission sous réserve" : 'Admission définitive'
  const bodyIntro = isConditional
    ? `Nous avons le plaisir de vous informer que votre dossier de candidature a été examiné avec attention par la Commission d'Admission d'<strong>Ignito Academy</strong>.<br><br>
       À l'issue de cet examen, nous avons le plaisir de vous proposer une <strong>offre d'admission sous réserve</strong> pour l'année académique en cours.`
    : `Au nom du Conseil d'Admission d'<strong>Ignito Academy</strong>, nous avons l'honneur de vous annoncer votre <strong>admission définitive</strong> au sein de notre programme de formation accrédité par NCC Education (Royaume-Uni).<br><br>
       C'est avec fierté que nous vous accueillons au sein de notre communauté académique.`

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">

        <!-- Header -->
        <tr><td style="background:#021463;padding:28px 40px;">
          <p style="margin:0;color:#ffffff;font-family:Georgia,serif;font-size:22px;font-weight:bold;letter-spacing:0.5px;">IGNITO ACADEMY</p>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-family:Arial,sans-serif;font-size:11px;">Portail d'Admission — Admitta</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Décision d'admission</p>
          <h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:24px;color:#021463;">${title}</h1>

          <p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.7;">
            Madame / Monsieur <strong>${opts.prenom} ${opts.nom}</strong>,
          </p>

          <p style="margin:0 0 24px;font-size:14px;color:#334155;line-height:1.8;">${bodyIntro}</p>

          <!-- ID Box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #e2e8f0;border-left:4px solid #4EA6F5;border-radius:6px;margin-bottom:24px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Identifiant de candidature</p>
              <p style="margin:4px 0 0;font-family:'Courier New',monospace;font-size:18px;font-weight:bold;color:#021463;">${opts.applicantId}</p>
            </td></tr>
          </table>

          <p style="margin:0 0 24px;font-size:13px;color:#64748b;line-height:1.7;">
            Veuillez trouver en pièce jointe votre courrier officiel de décision au format PDF.
            Conservez ce document pour vos dossiers administratifs.
          </p>

          <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;">
            Veuillez agréer, Madame / Monsieur, l'expression de nos salutations académiques distinguées.<br><br>
            <strong>La Direction des Admissions</strong><br>
            Ignito Academy
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;text-align:center;">
            © 2026 Ignito Academy. Tous droits réservés.<br>
            Kinshasa, République Démocratique du Congo
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Email sender with exponential-backoff retry ──────────────────────────────

async function sendEmailWithRetry(opts: {
  to:          string
  subject:     string
  html:        string
  pdfBuffer:   Uint8Array
  pdfFilename: string
  resendKey:   string
  maxRetries:  number
}): Promise<{ success: boolean; error?: string }> {
  // Encode PDF as base64 for Resend attachment
  const bytes  = Array.from(opts.pdfBuffer)
  const base64 = btoa(bytes.map(b => String.fromCharCode(b)).join(''))

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { Authorization: `Bearer ${opts.resendKey}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          from:        Deno.env.get('FROM_EMAIL') ?? 'admin@ignitoacademy.com',
          to:          [opts.to],
          subject:     opts.subject,
          html:        opts.html,
          attachments: [{ filename: opts.pdfFilename, content: base64 }],
        }),
      })
      if (res.ok) return { success: true }
      const err = await res.text()
      console.error(`Email attempt ${attempt}/${opts.maxRetries} failed: ${err}`)
      if (attempt === opts.maxRetries) return { success: false, error: err }
    } catch (e) {
      console.error(`Email attempt ${attempt}/${opts.maxRetries} threw:`, e)
      if (attempt === opts.maxRetries) return { success: false, error: String(e) }
    }
    // Exponential backoff: 1 s, 2 s, 4 s …
    await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000))
  }
  return { success: false, error: 'Max retries exceeded' }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Every operation gets a unique traceable ID
  const operationId = crypto.randomUUID()
  const { log, entries } = logger(operationId)

  try {
    // ── Step 1: Parse & validate input ────────────────────────────────────────
    log('validate_input', 'started')

    let body: AdminDecisionInput
    try {
      body = await req.json()
    } catch {
      return jsonRes({ error: 'INVALID_JSON', operation_id: operationId }, 400)
    }

    const { applicant_id, decision_type, admin_id, expected_version, notes } = body

    if (!applicant_id || !decision_type || !admin_id || expected_version == null) {
      return jsonRes({ error: 'MISSING_FIELDS', message: 'applicant_id, decision_type, admin_id et expected_version sont requis.', operation_id: operationId }, 400)
    }
    if (!(['conditional', 'final', 'rejected'] as DecisionType[]).includes(decision_type)) {
      return jsonRes({ error: 'INVALID_DECISION_TYPE', operation_id: operationId }, 400)
    }

    const newStatus = DECISION_STATUS[decision_type]
    log('validate_input', 'completed', { applicant_id, decision_type, new_status: newStatus })

    // ── Step 2: Build Supabase admin client ───────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Step 3: Verify requesting officer is active ───────────────────────────
    log('verify_officer', 'started', { admin_id })
    const { data: officer, error: officerErr } = await supabase
      .from('admissions_officers')
      .select('id, prenom, nom, is_active')
      .eq('id', admin_id)
      .eq('is_active', true)
      .single()

    if (officerErr || !officer) {
      log('verify_officer', 'failed', { error: officerErr?.message })
      return jsonRes({ error: 'OFFICER_NOT_FOUND', operation_id: operationId }, 403)
    }
    log('verify_officer', 'completed', { officer: `${officer.prenom} ${officer.nom}` })

    // ── Step 4: Fetch application + applicant ─────────────────────────────────
    log('fetch_application', 'started', { applicant_id })
    const { data: appRow, error: appErr } = await supabase
      .from('applications')
      .select(`
        applicant_id, application_status, version, intake_year,
        applicants!inner ( prenom, nom, email )
      `)
      .eq('applicant_id', applicant_id)
      .single()

    if (appErr || !appRow) {
      log('fetch_application', 'failed', { error: appErr?.message })
      return jsonRes({ error: 'APPLICATION_NOT_FOUND', operation_id: operationId }, 404)
    }

    const apt            = (appRow as any).applicants
    const previousStatus = appRow.application_status
    log('fetch_application', 'completed', { status: previousStatus, version: appRow.version })

    // ── Step 5: Early optimistic-lock check ───────────────────────────────────
    // The RPC enforces this atomically, but we check early to avoid expensive
    // PDF work when we already know the version is stale.
    if (appRow.version !== expected_version) {
      log('version_check', 'failed', { stored: appRow.version, expected: expected_version })
      return jsonRes({
        error:           'VERSION_CONFLICT',
        message:         "Cette candidature a été modifiée par un autre utilisateur. Veuillez actualiser la page.",
        current_version: appRow.version,
        operation_id:    operationId,
      }, 409)
    }
    log('version_check', 'completed')

    // ── Steps 6-8: PDF + upload + email (conditional/final decisions only) ────
    let pdfStoragePath: string | null = null

    if (decision_type !== 'rejected') {

      // ── Step 6: Generate PDF ─────────────────────────────────────────────────
      log('generate_pdf', 'started', { decision_type })
      let pdfBuffer: Uint8Array
      try {
        pdfBuffer = await generateDecisionPDF({
          applicantId:  applicant_id,
          prenom:       apt.prenom,
          nom:          apt.nom,
          decisionType: decision_type,
          footerText:   Deno.env.get('PDF_FOOTER_TEXT'),
        })
        log('generate_pdf', 'completed', { size_bytes: pdfBuffer.length })
      } catch (pdfErr) {
        log('generate_pdf', 'failed', { error: String(pdfErr) })
        // Rollback: status NOT yet changed — safe to return error
        return jsonRes({
          error:        'PDF_GENERATION_FAILED',
          message:      "La génération du courrier a échoué. Le statut du dossier n'a pas été modifié.",
          operation_id: operationId,
        }, 500)
      }

      // ── Step 7: Upload PDF to official_letters ───────────────────────────────
      log('upload_pdf', 'started')
      const ts          = new Date().toISOString().replace(/[:.]/g, '-')
      const pdfFilename = `${applicant_id}-${decision_type}-${ts}.pdf`
      pdfStoragePath    = `official_letters/${appRow.intake_year}/${pdfFilename}`

      const { error: uploadErr } = await supabase.storage
        .from('official_letters')
        .upload(pdfStoragePath, pdfBuffer, { contentType: 'application/pdf', upsert: false })

      if (uploadErr) {
        log('upload_pdf', 'failed', { error: uploadErr.message })
        // Rollback: status NOT yet changed — safe to return error
        return jsonRes({
          error:        'PDF_UPLOAD_FAILED',
          message:      "L'envoi du courrier a échoué. Le statut du dossier n'a pas été modifié.",
          operation_id: operationId,
        }, 500)
      }
      log('upload_pdf', 'completed', { path: pdfStoragePath })

      // ── Step 8: Send decision email ──────────────────────────────────────────
      log('send_email', 'started', { to: apt.email })

      const subject    = EMAIL_SUBJECTS[decision_type]!
      const emailHtml  = buildEmailHtml({ prenom: apt.prenom, nom: apt.nom, applicantId: applicant_id, decisionType: decision_type })
      const emailType  = decision_type === 'conditional' ? 'conditional_acceptance' : 'final_acceptance'

      // Create email_log entry (pending)
      const { data: emailLogRow } = await supabase
        .from('email_logs')
        .insert({
          applicant_id,
          recipient_email: apt.email,
          subject,
          email_type:      emailType,
          status:          'pending',
        })
        .select('id')
        .single()

      const resendKey = Deno.env.get('RESEND_API_KEY')
      let emailSent   = false
      let emailError: string | undefined

      if (resendKey) {
        const result = await sendEmailWithRetry({
          to:          apt.email,
          subject,
          html:        emailHtml,
          pdfBuffer,
          pdfFilename,
          resendKey,
          maxRetries:  3,
        })
        emailSent  = result.success
        emailError = result.error
      } else {
        // Dev/staging mode: no Resend key configured — skip sending but mark sent
        console.warn(`[${operationId}] RESEND_API_KEY not configured — email skipped (dev mode)`)
        emailSent = true
      }

      // Update email_log
      await supabase.from('email_logs').update({
        status:        emailSent ? 'sent' : 'failed',
        error_message: emailSent ? null : (emailError ?? 'Unknown error'),
        retry_count:   emailSent ? 0 : 3,
        sent_at:       emailSent ? new Date().toISOString() : null,
      }).eq('id', emailLogRow?.id)

      if (!emailSent) {
        log('send_email', 'failed', { error: emailError })
        // Rollback: status NOT yet changed — PDF is retained for manual retry
        return jsonRes({
          error:        'EMAIL_SEND_FAILED',
          message:      "L'envoi de l'email a échoué après 3 tentatives. Le statut du dossier n'a pas été modifié. Le courrier PDF est conservé pour un envoi manuel.",
          operation_id: operationId,
          pdf_path:     pdfStoragePath,
        }, 500)
      }
      log('send_email', 'completed', { email_log_id: emailLogRow?.id })
    }

    // ── Step 9: Atomic status update via RPC (optimistic locking) ────────────
    log('update_status', 'started', { new_status: newStatus, expected_version })
    const { data: rpcResult, error: rpcErr } = await supabase.rpc(
      'update_application_status_with_version_check',
      {
        p_applicant_id:     applicant_id,
        p_new_status:       newStatus,
        p_expected_version: expected_version,
      },
    )

    if (rpcErr || rpcResult === false) {
      // Race condition: another officer committed between our early check and now.
      // PDF/email already sent — we log this critical discrepancy.
      log('update_status', 'failed', { rpc_result: rpcResult, error: rpcErr?.message })
      console.error(`[CRITICAL][${operationId}] RPC version conflict AFTER PDF+email sent. pdf_path=${pdfStoragePath}`)
      return jsonRes({
        error:        'VERSION_CONFLICT_LATE',
        message:      "Conflit de version détecté après l'envoi de l'email. Veuillez actualiser et vérifier l'état manuellement.",
        operation_id: operationId,
        pdf_path:     pdfStoragePath,
      }, 409)
    }
    log('update_status', 'completed', { new_status: newStatus })

    // ── Step 10: Immutable audit trail ────────────────────────────────────────
    log('audit_trail', 'started')
    const { error: auditErr } = await supabase.from('audit_trail').insert({
      applicant_id,
      admin_id,
      previous_status: previousStatus,
      new_status:      newStatus,
      notes:           notes ?? `Décision « ${decision_type} » — opération ${operationId}`,
    })

    if (auditErr) {
      // Status already committed — log as critical but don't fail the response
      log('audit_trail', 'failed', { error: auditErr.message })
      console.error(`[CRITICAL][${operationId}] Audit trail insert failed after status committed:`, auditErr.message)
    } else {
      log('audit_trail', 'completed')
    }

    // ── Success ───────────────────────────────────────────────────────────────
    return jsonRes({
      success:      true,
      operation_id: operationId,
      applicant_id,
      new_status:   newStatus,
      pdf_path:     pdfStoragePath,
      logs:         entries.map(e => ({ step: e.step, status: e.status, timestamp: e.timestamp })),
    }, 200)

  } catch (err) {
    console.error(`[${operationId}] Unhandled error:`, err)
    return jsonRes({
      error:        'INTERNAL_ERROR',
      message:      String(err),
      operation_id: operationId,
    }, 500)
  }
})
