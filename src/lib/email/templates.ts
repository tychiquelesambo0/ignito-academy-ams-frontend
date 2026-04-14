/**
 * Formal academic French email templates for Ignito Academy / Admitta.
 * All templates return a complete HTML string ready to pass to Resend.
 */

// Production base URL — resolves to https://admissions.ignitoacademy.com in Vercel
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://admissions.ignitoacademy.com').replace(/\/$/, '')

// Publicly hosted alternative logo (served from the AMS /public folder)
const LOGO_URL = `${APP_URL}/ignito-logo-alt.svg`

// ─── Shared layout wrapper ─────────────────────────────────────────────────────

function layout(opts: {
  preheader: string
  headerTitle: string
  headerSubtitle: string
  body: string
}): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${opts.headerTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
    h1,h2,h3 { font-family:'Crimson Pro',Georgia,'Times New Roman',serif !important; }
    p,td,li,span,a { font-family:'Inter',Arial,sans-serif !important; }
  </style>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Inter',Arial,sans-serif;">

  <!-- Preheader (hidden) -->
  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${opts.preheader}</span>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;max-width:600px;width:100%;">

        <!-- Header — white background with logo -->
        <tr>
          <td style="background:#ffffff;padding:28px 40px 24px;border-bottom:3px solid #021463;text-align:center;">
            <img src="${LOGO_URL}" alt="Ignito Academy" width="180" height="auto"
                 style="display:block;margin:0 auto;max-width:180px;height:auto;" />
            <p style="margin:10px 0 0;font-family:'Inter',Arial,sans-serif;font-size:10px;
                      color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">
              ${opts.headerSubtitle}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            ${opts.body}
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
}

// ─── ID box component ──────────────────────────────────────────────────────────

function idBox(applicantId: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#F8FAFC;border:1px solid #e2e8f0;border-left:4px solid #4EA6F5;
           border-radius:6px;margin:0 0 24px;">
    <tr><td style="padding:14px 20px;">
      <p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:10px;color:#94a3b8;
                text-transform:uppercase;letter-spacing:1px;">Identifiant de candidature</p>
      <p style="margin:4px 0 0;font-family:'Courier New',monospace;font-size:18px;
                font-weight:bold;color:#021463;">${applicantId}</p>
    </td></tr>
  </table>`
}

// ─── Sign-off block ────────────────────────────────────────────────────────────

function signOff(): string {
  return `
  <p style="margin:24px 0 0;font-size:13px;color:#334155;line-height:1.7;
            font-family:'Inter',Arial,sans-serif;">
    Veuillez agréer, Madame / Monsieur, l'expression de nos salutations académiques distinguées.<br /><br />
    <strong style="color:#021463;">Bureau d'admissions — Ignito Academy</strong>
  </p>`
}

// ─── Template 1: Payment confirmation ────────────────────────────────────────

export function paymentConfirmationEmail(opts: {
  prenom:      string
  nom:         string
  applicantId: string
  amount:      string   // e.g. "29 USD"
  date:        string   // ISO string
}): { subject: string; html: string } {
  const dateStr = new Date(opts.date).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const body = `
    <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;
              text-transform:uppercase;letter-spacing:1px;">Confirmation de paiement</p>
    <h1 style="margin:0 0 24px;font-family:'Crimson Pro',Georgia,serif;font-size:26px;color:#021463;">
      Votre dossier est en cours d'évaluation
    </h1>

    <p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.7;font-family:'Inter',Arial,sans-serif;">
      Madame / Monsieur <strong>${opts.prenom} ${opts.nom}</strong>,
    </p>

    <p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
      Nous accusons bonne réception de votre règlement des frais d'étude de dossier d'un montant
      de <strong>${opts.amount}</strong>, effectué le <strong>${dateStr}</strong>.
    </p>

    ${idBox(opts.applicantId)}

    <!-- Receipt box -->
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#F0FDF4;border:1px solid #bbf7d0;border-left:4px solid #10B981;
             border-radius:6px;margin-bottom:24px;">
      <tr><td style="padding:14px 20px;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:10px;color:#065f46;
                  text-transform:uppercase;letter-spacing:1px;font-weight:bold;">
          Paiement confirmé
        </p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:bold;color:#065f46;">
          ${opts.amount} — Frais d'étude de dossier (non remboursable)
        </p>
      </td></tr>
    </table>

    <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
      Votre dossier est désormais transmis à la Commission des Admissions pour évaluation.
      Vous serez informé(e) de la décision finale par voie électronique dans les meilleurs délais.
    </p>

    <p style="margin:0 0 24px;font-size:13px;color:#64748b;line-height:1.7;font-family:Arial,sans-serif;">
      Vous pouvez suivre l'avancement de votre candidature en temps réel sur le portail
      <a href="${APP_URL}" style="color:#021463;font-weight:bold;">Admitta</a>.
      Conservez cet email comme preuve de paiement.
    </p>

    ${signOff()}`

  return {
    subject: `Paiement reçu — Votre dossier IGN ${opts.applicantId} est en cours d'évaluation`,
    html:    layout({
      preheader:       `Confirmation de paiement de ${opts.amount} pour votre candidature ${opts.applicantId}.`,
      headerTitle:     'Confirmation de paiement',
      headerSubtitle:  'Portail d\'Admission — Admitta',
      body,
    }),
  }
}

// ─── Template 2: Final acceptance ─────────────────────────────────────────────

export function finalAcceptanceEmail(opts: {
  prenom:      string
  nom:         string
  applicantId: string
}): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;
              text-transform:uppercase;letter-spacing:1px;">Décision d'admission</p>
    <h1 style="margin:0 0 24px;font-family:'Crimson Pro',Georgia,serif;font-size:26px;color:#021463;">
      Félicitations — Admission définitive
    </h1>

    <p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.7;font-family:'Inter',Arial,sans-serif;">
      Madame / Monsieur <strong>${opts.prenom} ${opts.nom}</strong>,
    </p>

    <!-- Congratulations banner -->
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#F0FDF4;border:1px solid #bbf7d0;border-left:4px solid #10B981;
             border-radius:6px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;font-family:Georgia,serif;font-size:15px;font-weight:bold;color:#065f46;">
          Vous êtes officiellement admis(e) à Ignito Academy — Promotion Septembre 2026.
        </p>
      </td></tr>
    </table>

    ${idBox(opts.applicantId)}

    <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
      C'est avec un immense plaisir que le Comité des Admissions vous annonce votre admission
      définitive à l'<strong>Année Préparatoire</strong> au sein d'Ignito Academy pour la
      rentrée de <strong>Septembre 2026</strong>.
    </p>

    <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
      Votre parcours académique a démontré le potentiel nécessaire pour exceller dans le système
      universitaire britannique. Cette offre marque le début de votre parcours continu de 4 ans
      vers l'obtention de votre <strong>Licence Britannique (Bachelor's Degree)</strong>, reconnue
      selon le cadre d'excellence britannique (RQF).
    </p>

    <p style="margin:0 0 24px;font-size:14px;color:#334155;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
      Votre lettre d'admission officielle est disponible en téléchargement sur votre portail.
      Veuillez vous connecter au portail
      <a href="${APP_URL}/dashboard" style="color:#021463;font-weight:bold;">Admitta</a>
      pour télécharger votre lettre et procéder aux formalités d'inscription finale.
    </p>

    ${signOff()}`

  return {
    subject: `Félicitations — Admission définitive à Ignito Academy (${opts.applicantId})`,
    html:    layout({
      preheader:       `Félicitations ${opts.prenom} ! Vous êtes officiellement admis(e) à Ignito Academy.`,
      headerTitle:     'Admission définitive',
      headerSubtitle:  'Bureau des Admissions',
      body,
    }),
  }
}

// ─── Template 3: Conditional acceptance ───────────────────────────────────────

export function conditionalAcceptanceEmail(opts: {
  prenom:             string
  nom:                string
  applicantId:        string
  conditionalMessage: string
}): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;
              text-transform:uppercase;letter-spacing:1px;">Décision d'admission</p>
    <h1 style="margin:0 0 24px;font-family:'Crimson Pro',Georgia,serif;font-size:26px;color:#021463;">
      Offre d'admission sous réserve
    </h1>

    <p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.7;font-family:'Inter',Arial,sans-serif;">
      Madame / Monsieur <strong>${opts.prenom} ${opts.nom}</strong>,
    </p>

    ${idBox(opts.applicantId)}

    <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
      Suite à l'évaluation rigoureuse de votre candidature, le Comité des Admissions a le plaisir
      de vous proposer une <strong>offre d'admission sous réserve</strong> pour l'<strong>Année
      Préparatoire</strong> au sein d'Ignito Academy pour la rentrée de Septembre 2026.
    </p>

    <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
      Votre profil académique correspond à nos standards d'excellence. Cependant, votre admission
      définitive est subordonnée à la réception des éléments suivants :
    </p>

    <!-- Condition box -->
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#FFFBEB;border:1px solid #fde68a;border-left:4px solid #F59E0B;
             border-radius:6px;margin:0 0 24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:10px;color:#92400e;
                  text-transform:uppercase;letter-spacing:1px;font-weight:bold;">
          Condition(s) à remplir
        </p>
        <p style="margin:0;font-size:14px;font-weight:bold;color:#78350f;line-height:1.6;">
          ${opts.conditionalMessage}
        </p>
      </td></tr>
    </table>

    <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
      Vous disposez d'un délai limité pour soumettre ces documents directement sur le portail
      <a href="${APP_URL}" style="color:#021463;font-weight:bold;">Admitta</a>.
      Dès leur validation par le Comité, votre statut passera automatiquement en
      <strong>Admission Définitive</strong>.
    </p>

    <p style="margin:0 0 24px;font-size:13px;color:#64748b;line-height:1.7;font-family:Arial,sans-serif;">
      Votre lettre de décision officielle est disponible en téléchargement sur votre portail
      <a href="${APP_URL}/dashboard" style="color:#021463;font-weight:bold;">Admitta</a>.
    </p>

    ${signOff()}`

  return {
    subject: `Offre d'admission sous réserve — Action requise (${opts.applicantId})`,
    html:    layout({
      preheader:       `Votre candidature ${opts.applicantId} a été évaluée. Une action est requise.`,
      headerTitle:     "Offre d'admission sous réserve",
      headerSubtitle:  'Bureau des Admissions',
      body,
    }),
  }
}

// ─── Template 4a: Documents submitted (initial) ───────────────────────────────

export function documentsSubmittedEmail(opts: {
  prenom:      string
  nom:         string
  applicantId: string
}): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;
              text-transform:uppercase;letter-spacing:1px;">Confirmation de dépôt</p>
    <h1 style="margin:0 0 24px;font-family:'Crimson Pro',Georgia,serif;font-size:26px;color:#021463;">
      Vos documents ont bien été reçus
    </h1>

    <p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.7;font-family:'Inter',Arial,sans-serif;">
      Madame / Monsieur <strong>${opts.prenom} ${opts.nom}</strong>,
    </p>

    ${idBox(opts.applicantId)}

    <p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
      Nous accusons bonne réception de vos pièces justificatives. Votre dossier est désormais
      complet et prêt pour l'étape de paiement des frais d'étude de dossier.
    </p>

    <!-- Next step box -->
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#F8FAFC;border:1px solid #e2e8f0;border-left:4px solid #4EA6F5;
             border-radius:6px;margin:0 0 24px;">
      <tr><td style="padding:14px 20px;">
        <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:10px;color:#64748b;
                  text-transform:uppercase;letter-spacing:1px;font-weight:bold;">
          Prochaine étape
        </p>
        <p style="margin:0;font-size:14px;color:#021463;font-weight:bold;line-height:1.6;">
          Réglez les frais d'étude de dossier sur le portail Admitta pour soumettre
          officiellement votre candidature à la Commission des Admissions.
        </p>
      </td></tr>
    </table>

    <p style="margin:0 0 24px;font-size:13px;color:#64748b;line-height:1.7;font-family:Arial,sans-serif;">
      Connectez-vous à votre espace candidat sur le portail
      <a href="${APP_URL}/dashboard" style="color:#021463;font-weight:bold;">Admitta</a>
      pour procéder au paiement et finaliser votre candidature.
    </p>

    ${signOff()}`

  return {
    subject: `Documents reçus — Prochaine étape : paiement (${opts.applicantId})`,
    html:    layout({
      preheader:      `Vos documents pour la candidature ${opts.applicantId} ont bien été reçus.`,
      headerTitle:    'Documents reçus',
      headerSubtitle: 'Bureau des Admissions — Admitta',
      body,
    }),
  }
}

// ─── Template 5: Refusal ──────────────────────────────────────────────────────

export function refusalEmail(opts: {
  prenom:      string
  nom:         string
  applicantId: string
}): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;
              text-transform:uppercase;letter-spacing:1px;">Décision d'admission</p>
    <h1 style="margin:0 0 24px;font-family:'Crimson Pro',Georgia,serif;font-size:26px;color:#1e293b;">
      Mise à jour de votre dossier
    </h1>

    <p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.7;font-family:'Inter',Arial,sans-serif;">
      Madame / Monsieur <strong>${opts.prenom} ${opts.nom}</strong>,
    </p>

    ${idBox(opts.applicantId)}

    <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
      Le Comité des Admissions vous remercie de l'intérêt que vous portez à Ignito Academy.
      Nous avons étudié votre dossier avec la plus grande attention et le plus grand soin.
    </p>

    <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
      Le nombre de places pour notre cohorte de <strong>Septembre 2026</strong> étant strictement
      limité, notre processus de sélection s'est révélé particulièrement compétitif cette année.
      C'est avec regret que nous ne pouvons pas, à ce stade, vous offrir une place au sein de
      notre programme.
    </p>

    <p style="margin:0 0 24px;font-size:14px;color:#334155;line-height:1.8;font-family:'Inter',Arial,sans-serif;">
      Cette décision ne remet nullement en cause vos qualités personnelles ni votre potentiel
      académique. Nous vous souhaitons une excellente continuation et beaucoup de succès dans
      vos futurs projets universitaires.
    </p>

    ${signOff()}`

  return {
    subject: `Mise à jour de votre candidature Ignito Academy (${opts.applicantId})`,
    html:    layout({
      preheader:       `Mise à jour concernant votre candidature ${opts.applicantId} à Ignito Academy.`,
      headerTitle:     'Mise à jour de votre dossier',
      headerSubtitle:  'Bureau des Admissions',
      body,
    }),
  }
}
