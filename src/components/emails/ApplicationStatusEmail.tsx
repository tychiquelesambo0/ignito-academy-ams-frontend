/**
 * ApplicationStatusEmail — React Email template for all applicant status notifications.
 *
 * Statuses handled:
 *   en_cours_devaluation   → dossier submitted & paid
 *   Admission sous réserve → conditional offer
 *   Admission définitive   → final acceptance (félicitations)
 *   Dossier refusé         → rejection (dignified, no detail)
 */

import React from 'react'
import {
  Html, Head, Preview, Body, Container, Section,
  Text, Button, Hr,
} from '@react-email/components'

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatusEmailType =
  | 'en_cours_devaluation'
  | 'Admission sous réserve'
  | 'Admission définitive'
  | 'Dossier refusé'

export interface ApplicationStatusEmailProps {
  applicantName:      string    // e.g. "Jean Kabila"
  applicantId:        string    // e.g. "IGN-2026-00001"
  status:             StatusEmailType
  dashboardUrl:       string    // https://ignitoacademy.com/dashboard
  conditionalMessage?: string   // only used for 'Admission sous réserve'
}

// ─── Per-status content map ───────────────────────────────────────────────────

interface StatusContent {
  previewText:  string
  eyebrow:      string
  heading:      string
  body:         string
  highlight?:   { text: string; color: 'green' | 'amber' | 'red' }
  buttonLabel:  string
}

function getContent(
  status: StatusEmailType,
  name: string,
  conditionalMessage?: string,
): StatusContent {
  switch (status) {
    case 'en_cours_devaluation':
      return {
        previewText: `Votre dossier est en cours d'évaluation — Ignito Academy`,
        eyebrow:     'Confirmation de candidature',
        heading:     "Votre dossier est en cours d'évaluation",
        body:        `Cher/Chère ${name}, nous confirmons la réception de votre candidature et de votre paiement. Votre dossier est désormais entre les mains de notre Comité des Admissions. Nous vous contacterons dès qu'une décision aura été prise.`,
        highlight:   { text: "Dossier reçu · Paiement confirmé · En cours d\u2019évaluation", color: 'green' },
        buttonLabel: 'Suivre mon dossier',
      }

    case 'Admission sous réserve':
      return {
        previewText: `Mise à jour importante : Offre d'Admission Sous Réserve — Ignito Academy`,
        eyebrow:     "Décision d'admission",
        heading:     "Offre d'Admission Sous Réserve",
        body:        `Cher/Chère ${name}, le Comité des Admissions a le plaisir de vous faire une offre d'admission sous réserve. Veuillez vous connecter immédiatement à votre portail Admitta pour consulter les conditions requises et télécharger les documents manquants.`,
        highlight:   {
          text:  conditionalMessage ?? 'Des documents complémentaires vous sont demandés. Connectez-vous à votre portail pour les détails.',
          color: 'amber',
        },
        buttonLabel: 'Voir les conditions',
      }

    case 'Admission définitive':
      return {
        previewText: `FÉLICITATIONS : Vous êtes admis(e) à Ignito Academy`,
        eyebrow:     "Décision d'admission",
        heading:     'Félicitations — Vous êtes admis(e) !',
        body:        `Cher/Chère ${name}, c'est avec un immense plaisir que nous vous annonçons votre admission définitive à Ignito Academy. Votre lettre d'admission officielle est disponible au téléchargement sur votre portail.`,
        highlight:   { text: 'Vous êtes officiellement admis(e) — Promotion Septembre 2026', color: 'green' },
        buttonLabel: "Télécharger ma lettre d'admission",
      }

    case 'Dossier refusé':
      return {
        previewText: `Mise à jour concernant votre candidature à Ignito Academy`,
        eyebrow:     "Mise à jour de votre candidature",
        heading:     'Information concernant votre dossier',
        body:        `Cher/Chère ${name}, nous vous remercions de l'intérêt que vous portez à Ignito Academy. Après une étude attentive de votre dossier, nous ne pouvons malheureusement pas vous offrir de place pour cette rentrée. Veuillez consulter votre portail pour télécharger la lettre officielle.`,
        buttonLabel: 'Accéder à mon portail',
      }
  }
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const styles = {
  body:       { backgroundColor: '#F8FAFC', margin: '0', padding: '0', fontFamily: 'Arial, Helvetica, sans-serif' },
  outer:      { padding: '40px 0' },
  card:       { backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0', maxWidth: '600px', margin: '0 auto' },
  header:     { backgroundColor: '#021463', padding: '28px 40px 24px' },
  headerName: { margin: '0', color: '#ffffff', fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.5px' },
  headerSub:  { margin: '4px 0 0', color: 'rgba(255,255,255,0.55)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' as const },
  content:    { padding: '36px 40px 28px' },
  eyebrow:    { margin: '0 0 6px', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '1px' },
  heading:    { margin: '0 0 24px', fontSize: '24px', color: '#021463', fontFamily: 'Georgia, serif', lineHeight: '1.3' },
  salutation: { margin: '0 0 16px', fontSize: '15px', color: '#1e293b', lineHeight: '1.7' },
  paragraph:  { margin: '0 0 20px', fontSize: '14px', color: '#334155', lineHeight: '1.8' },
  idBox:      { backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderLeft: '4px solid #4EA6F5', borderRadius: '6px', padding: '14px 20px', marginBottom: '24px' },
  idLabel:    { margin: '0', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '1px' },
  idValue:    { margin: '4px 0 0', fontSize: '18px', fontWeight: 'bold', color: '#021463', fontFamily: 'monospace' },
  button:     { backgroundColor: '#021463', color: '#ffffff', padding: '14px 28px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', textDecoration: 'none', display: 'inline-block' },
  hr:         { borderColor: '#E2E8F0', margin: '24px 0' },
  signOff:    { margin: '0', fontSize: '13px', color: '#334155', lineHeight: '1.8', fontFamily: 'Georgia, serif' },
  footer:     { backgroundColor: '#F1F5F9', borderTop: '1px solid #E2E8F0', padding: '20px 40px' },
  footerText: { margin: '0', fontSize: '11px', color: '#94a3b8', textAlign: 'center' as const, lineHeight: '1.6' },
}

const HIGHLIGHT_COLORS = {
  green: { bg: '#F0FDF4', border: '#10B981', text: '#065f46' },
  amber: { bg: '#FFFBEB', border: '#F59E0B', text: '#78350f' },
  red:   { bg: '#FEF2F2', border: '#EF4444', text: '#991b1b' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ApplicationStatusEmail({
  applicantName,
  applicantId,
  status,
  dashboardUrl,
  conditionalMessage,
}: ApplicationStatusEmailProps) {
  const c    = getContent(status, applicantName, conditionalMessage)
  const hl   = c.highlight ? HIGHLIGHT_COLORS[c.highlight.color] : null

  return (
    <Html lang="fr">
      <Head />
      <Preview>{c.previewText}</Preview>

      <Body style={styles.body}>
        <Container style={styles.outer}>
          <Section style={styles.card}>

            {/* ── Header ───────────────────────────────────────────────────── */}
            <Section style={styles.header}>
              <Text style={styles.headerName}>IGNITO ACADEMY</Text>
              <Text style={styles.headerSub}>Bureau des Admissions — Portail Admitta</Text>
            </Section>

            {/* ── Body ─────────────────────────────────────────────────────── */}
            <Section style={styles.content}>

              <Text style={styles.eyebrow}>{c.eyebrow}</Text>
              <Text style={styles.heading}>{c.heading}</Text>

              {/* Applicant ID box */}
              <Section style={styles.idBox}>
                <Text style={styles.idLabel}>Identifiant de candidature</Text>
                <Text style={styles.idValue}>{applicantId}</Text>
              </Section>

              {/* Salutation + body paragraph */}
              <Text style={styles.paragraph}>{c.body}</Text>

              {/* Highlight banner (conditional/success/warning) */}
              {hl && c.highlight && (
                <Section style={{
                  backgroundColor: hl.bg,
                  border:          `1px solid ${hl.border}`,
                  borderLeft:      `4px solid ${hl.border}`,
                  borderRadius:    '6px',
                  padding:         '14px 20px',
                  marginBottom:    '24px',
                }}>
                  <Text style={{ margin: '0', fontSize: '13px', fontWeight: 'bold', color: hl.text, lineHeight: '1.6' }}>
                    {c.highlight.text}
                  </Text>
                </Section>
              )}

              {/* CTA Button */}
              <Section style={{ textAlign: 'center', margin: '28px 0' }}>
                <Button href={dashboardUrl} style={styles.button}>
                  {c.buttonLabel}
                </Button>
              </Section>

              <Hr style={styles.hr} />

              {/* Sign-off */}
              <Text style={styles.signOff}>
                Veuillez agréer, Madame / Monsieur, l'expression de nos salutations académiques distinguées.
                <br /><br />
                <strong>Tychique Lesambo</strong><br />
                <span style={{ color: '#64748b', fontFamily: 'Arial, sans-serif', fontSize: '12px' }}>
                  Directeur Académique — Ignito Academy
                </span>
              </Text>
            </Section>

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <Section style={styles.footer}>
              <Text style={styles.footerText}>
                © 2026 Ignito Academy. Tous droits réservés.<br />
                Kinshasa, République Démocratique du Congo<br />
                <span style={{ color: '#cbd5e1' }}>Ce message est généré automatiquement — veuillez ne pas y répondre.</span>
              </Text>
            </Section>

          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// ─── Subject line helper ──────────────────────────────────────────────────────

export function getStatusEmailSubject(status: StatusEmailType, applicantId: string): string {
  switch (status) {
    case 'en_cours_devaluation':
      return `Ignito Academy : Votre dossier ${applicantId} est en cours d'évaluation`
    case 'Admission sous réserve':
      return `Mise à jour importante : Offre d'Admission Sous Réserve (${applicantId})`
    case 'Admission définitive':
      return `FÉLICITATIONS : Vous êtes admis(e) à Ignito Academy (${applicantId})`
    case 'Dossier refusé':
      return `Mise à jour concernant votre candidature à Ignito Academy (${applicantId})`
  }
}
