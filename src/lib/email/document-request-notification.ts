/**
 * Email envoyé au candidat lorsque le Bureau des Admissions demande
 * des pièces complémentaires (champ applications.conditional_message).
 */

import { Resend } from 'resend'

const appBaseUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL ?? 'https://ignitoacademy.com').replace(/\/$/, '')

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildDocumentRequestEmail(opts: {
  prenom: string
  nom: string
  applicantId: string
  message: string
}): { subject: string; html: string } {
  const name        = escapeHtml(`${opts.prenom} ${opts.nom}`.trim())
  const applicantId = escapeHtml(opts.applicantId)
  const messageBlock = escapeHtml(opts.message).replace(/\r\n|\n|\r/g, '<br/>')
  const documentsUrl = `${appBaseUrl()}/dashboard/documents`

  const subject =
    `Ignito Academy — Pièces complémentaires requises pour le dossier ${opts.applicantId}`

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Demande de pièces complémentaires</title>
</head>
<body style="background:#F8FAFC;margin:0;padding:0;font-family:Georgia,'Times New Roman',serif;">
  <div style="padding:32px 16px;">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:8px;padding:28px 24px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:bold;letter-spacing:0.08em;color:#031463;text-transform:uppercase;">
        Bureau des admissions
      </p>
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0F172A;line-height:1.35;">
        Pièces complémentaires requises
      </h1>
      <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.65;">
        Bonjour ${name},
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.65;">
        Concernant votre dossier de candidature
        <strong style="color:#031463;">${applicantId}</strong>, le Bureau des Admissions vous prie
        de fournir les pièces ou précisions suivantes&nbsp;:
      </p>
      <div style="margin:0 0 24px;padding:16px 18px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;border-left:4px solid #4EA6F5;">
        <p style="margin:0;font-size:14px;color:#0F172A;line-height:1.65;">${messageBlock}</p>
      </div>
      <p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.65;">
        Veuillez vous connecter à votre espace candidat, ouvrir la section
        <strong>Documents</strong>, puis téléverser les fichiers demandés (formats PDF, JPG ou PNG,
        5&nbsp;Mo maximum par fichier).
      </p>
      <a href="${documentsUrl}" style="display:inline-block;padding:14px 22px;background:#031463;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;">
        Accéder à la page Documents
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#64748B;line-height:1.5;">
        Si le lien ne fonctionne pas, copiez cette adresse dans votre navigateur&nbsp;:<br/>
        <span style="word-break:break-all;color:#4EA6F5;">${escapeHtml(documentsUrl)}</span>
      </p>
    </div>
  </div>
</body>
</html>`

  return { subject, html }
}

export type SendDocumentRequestResult =
  | { ok: true; wasMock: boolean; recipient: string }
  | { ok: false; error: string; recipient?: string }

export async function sendDocumentRequestEmail(opts: {
  to: string
  prenom: string
  nom: string
  applicantId: string
  message: string
}): Promise<SendDocumentRequestResult> {
  const { subject, html } = buildDocumentRequestEmail(opts)

  const resendKey = process.env.RESEND_API_KEY
  const isMock =
    !resendKey || resendKey.startsWith('mock-') || resendKey === 'your-resend-api-key'

  if (isMock) {
    console.warn(
      '[document-request-email] MOCK — définissez RESEND_API_KEY pour envoyer un véritable courriel.',
    )
    return { ok: true, wasMock: true, recipient: opts.to }
  }

  try {
    const resend    = new Resend(resendKey)
    const fromEmail = process.env.FROM_EMAIL?.trim() || 'Ignito Academy <admin@ignitoacademy.com>'
    const { data, error } = await resend.emails.send({
      from:    fromEmail,
      to:      [opts.to],
      subject,
      html,
    })
    if (error) {
      console.error('[document-request-email] Resend:', error)
      return { ok: false, error: error.message, recipient: opts.to }
    }
    console.log('[document-request-email] envoyé, id=', data?.id)
    return { ok: true, wasMock: false, recipient: opts.to }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[document-request-email] exception:', e)
    return { ok: false, error: msg, recipient: opts.to }
  }
}
