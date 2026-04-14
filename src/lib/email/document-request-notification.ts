/**
 * Email envoyé au candidat lorsque le Bureau des Admissions demande
 * des pièces complémentaires (champ applications.conditional_message).
 */

import { Resend } from 'resend'

const appBaseUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL ?? 'https://admissions.ignitoacademy.com').replace(/\/$/, '')

const logoUrl = () => `${appBaseUrl()}/ignito-logo-alt.svg`

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
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
    h1,h2,h3 { font-family:'Crimson Pro',Georgia,'Times New Roman',serif !important; }
    p,td,li,span,a { font-family:'Inter',Arial,sans-serif !important; }
  </style>
</head>
<body style="background:#F8FAFC;margin:0;padding:0;font-family:'Inter',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#ffffff;padding:28px 40px 24px;border-bottom:3px solid #021463;text-align:center;">
            <img src="${logoUrl()}" alt="Ignito Academy" width="180" height="auto"
                 style="display:block;margin:0 auto;max-width:180px;height:auto;" />
            <p style="margin:10px 0 0;font-family:'Inter',Arial,sans-serif;font-size:10px;
                      color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">
              Bureau des Admissions — Admitta
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 6px;font-family:'Inter',Arial,sans-serif;font-size:11px;color:#94a3b8;
                      text-transform:uppercase;letter-spacing:1px;">Documents requis</p>
            <h1 style="margin:0 0 20px;font-family:'Crimson Pro',Georgia,serif;font-size:26px;color:#021463;line-height:1.3;">
              Pièces complémentaires requises
            </h1>

            <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
              Madame / Monsieur <strong>${name}</strong>,
            </p>

            <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
              Concernant votre dossier de candidature
              <strong style="color:#021463;">${applicantId}</strong>, le Bureau des Admissions vous prie
              de fournir les pièces ou précisions suivantes&nbsp;:
            </p>

            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#EFF6FF;border:1px solid #BFDBFE;border-left:4px solid #4EA6F5;
                     border-radius:6px;margin:0 0 24px;">
              <tr><td style="padding:16px 18px;">
                <p style="margin:0;font-size:14px;color:#0F172A;line-height:1.65;font-family:'Inter',Arial,sans-serif;">
                  ${messageBlock}
                </p>
              </td></tr>
            </table>

            <p style="margin:0 0 24px;font-size:14px;color:#334155;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
              Veuillez vous connecter à votre espace candidat, ouvrir la section
              <strong>Documents</strong>, puis téléverser les fichiers demandés (formats PDF, JPG ou PNG,
              5&nbsp;Mo maximum par fichier).
            </p>

            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#021463;border-radius:6px;">
                  <a href="${documentsUrl}"
                     style="display:inline-block;padding:14px 28px;color:#ffffff;
                            font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:600;
                            text-decoration:none;letter-spacing:0.3px;">
                    Accéder à la page Documents
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;font-family:'Inter',Arial,sans-serif;line-height:1.6;">
              Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
            </p>
            <p style="margin:0 0 24px;font-size:11px;color:#4EA6F5;font-family:'Courier New',monospace;word-break:break-all;">
              ${escapeHtml(documentsUrl)}
            </p>

            <p style="margin:24px 0 0;font-size:13px;color:#334155;line-height:1.7;font-family:'Inter',Arial,sans-serif;">
              Veuillez agréer, Madame / Monsieur, l'expression de nos salutations académiques distinguées.<br /><br />
              <strong style="color:#021463;">Bureau d'admissions — Ignito Academy</strong>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:11px;
                      color:#94a3b8;text-align:center;line-height:1.6;">
              © 2026 Ignito Academy. Tous droits réservés.<br />
              Kinshasa, République Démocratique du Congo<br />
              <span style="color:#cbd5e1;">Ce message est généré automatiquement — veuillez ne pas y répondre.</span>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

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
    const fromEmail = process.env.FROM_EMAIL?.trim() || 'Ignito Academy <admissions@ignitoacademy.com>'
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
