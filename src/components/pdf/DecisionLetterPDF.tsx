import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DecisionStatus =
  | 'Admission définitive'
  | 'Admission sous réserve'
  | 'Dossier refusé'

interface Props {
  applicantName:       string
  applicantId:         string
  status:              DecisionStatus
  conditionalMessage?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_FR = [
  'janvier','février','mars','avril','mai','juin',
  'juillet','août','septembre','octobre','novembre','décembre',
]

function frenchDate(): string {
  const d = new Date()
  return `Kinshasa, le ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── Page ──────────────────────────────────────────────────────────────────
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10.5,
    color: '#1E293B',
    lineHeight: 1.5,
    paddingTop: 52,
    paddingBottom: 80,
    paddingHorizontal: 60,
    backgroundColor: '#FFFFFF',
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  logo: {
    width: 130,
    height: 44,
    objectFit: 'contain',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  bureauLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#021463',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 3,
  },
  headerDate: {
    fontSize: 8.5,
    color: '#64748B',
    marginBottom: 2,
  },
  headerRef: {
    fontSize: 8.5,
    color: '#94A3B8',
  },

  // ── Dividers ──────────────────────────────────────────────────────────────
  navyRule: {
    borderBottomWidth: 2,
    borderBottomColor: '#021463',
    marginTop: 14,
    marginBottom: 28,
  },

  // ── Subject block ─────────────────────────────────────────────────────────
  subjectBox: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 22,
    borderLeftWidth: 3.5,
    borderLeftColor: '#021463',
    backgroundColor: '#F8FAFC',
  },
  subjectLabel: {
    fontSize: 7.5,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
    fontFamily: 'Helvetica-Bold',
  },
  subjectText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: '#021463',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // ── Body ──────────────────────────────────────────────────────────────────
  salutation: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
    marginBottom: 16,
    color: '#1E293B',
  },
  para: {
    fontSize: 10.5,
    lineHeight: 1.5,
    textAlign: 'justify',
    marginBottom: 12,
    color: '#1E293B',
  },

  // ── Conditional message box ────────────────────────────────────────────────
  condWrapper: {
    marginVertical: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#021463',
    backgroundColor: '#F8FAFC',
    padding: 14,
  },
  condLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#021463',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  condText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
    color: '#1E293B',
    lineHeight: 1.5,
  },

  // ── Final acceptance highlight ─────────────────────────────────────────────
  successWrapper: {
    marginVertical: 14,
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    padding: 14,
  },
  successText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
    color: '#065F46',
    lineHeight: 1.5,
  },

  // ── Sign-off (right-aligned) ───────────────────────────────────────────────
  signOffSection: {
    marginTop: 40,
  },
  closing: {
    fontSize: 10.5,
    lineHeight: 1.5,
    marginBottom: 32,
    textAlign: 'justify',
    color: '#1E293B',
  },
  signatureOuter: {
    alignItems: 'flex-end',
  },
  signatureBlock: {
    width: 210,
    borderTopWidth: 0.5,
    borderTopColor: '#CBD5E1',
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  signatureImg: {
    width: 65,
    height: 44,
    marginBottom: 6,
  },
  signatureName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#1E293B',
    marginBottom: 1,
  },
  signatureTitle: {
    fontSize: 9,
    color: '#64748B',
    marginBottom: 1,
  },
  signatureOrg: {
    fontSize: 9,
    color: '#021463',
    fontFamily: 'Helvetica-Bold',
  },

  // ── Footer (pinned) ───────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 60,
    right: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: '#CBD5E1',
  },
  footerBrand: {
    fontSize: 7,
    color: '#94A3B8',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
})

// ─── Letter body variants ──────────────────────────────────────────────────────

function BodyFinalAcceptance({ applicantName }: { applicantName: string }) {
  return (
    <>
      <Text style={s.salutation}>Cher/Chère {applicantName},</Text>

      <View style={s.successWrapper}>
        <Text style={s.successText}>
          Félicitations — Vous êtes officiellement admis(e) à Ignito Academy.
        </Text>
      </View>

      <Text style={s.para}>
        C'est avec un immense plaisir que le Comité des Admissions vous annonce votre
        admission définitive à l'Année Préparatoire Internationale (Qualification de
        Niveau 3 — L3IFDHES) au sein d'Ignito Academy pour la rentrée de Septembre 2026.
      </Text>

      <Text style={s.para}>
        Votre parcours académique a démontré le potentiel nécessaire pour exceller dans
        le système universitaire britannique. Cette offre marque le début de votre parcours
        continu de 4 ans vers l'obtention de votre Licence Britannique (Bachelor's Degree),
        reconnue internationalement.
      </Text>

      <Text style={s.para}>
        Veuillez vous connecter à votre portail Admitta pour accepter cette offre et
        procéder aux formalités d'inscription finale. Nous sommes impatients de vous
        accueillir au sein de notre communauté académique d'excellence.
      </Text>
    </>
  )
}

function BodyConditional({
  applicantName,
  conditionalMessage,
}: {
  applicantName:      string
  conditionalMessage: string
}) {
  return (
    <>
      <Text style={s.salutation}>Cher/Chère {applicantName},</Text>

      <Text style={s.para}>
        Suite à l'évaluation rigoureuse de votre candidature, le Comité des Admissions
        a le plaisir de vous proposer une offre d'admission sous réserve pour l'Année
        Préparatoire Internationale (L3IFDHES) pour la rentrée de Septembre 2026.
      </Text>

      <Text style={s.para}>
        Votre profil académique correspond à nos standards d'excellence. Cependant,
        votre admission définitive est subordonnée à la réception des éléments suivants :
      </Text>

      <View style={s.condWrapper}>
        <Text style={s.condLabel}>Condition(s) à remplir</Text>
        <Text style={s.condText}>{conditionalMessage}</Text>
      </View>

      <Text style={s.para}>
        Vous disposez d'un délai limité pour télécharger ces documents directement sur
        votre portail Admitta. Dès leur validation par le Comité, votre statut passera
        automatiquement en Admission Définitive.
      </Text>
    </>
  )
}

function BodyRefusal({ applicantName, applicantId }: { applicantName: string; applicantId: string }) {
  return (
    <>
      <Text style={s.salutation}>Cher/Chère {applicantName},</Text>

      <Text style={s.para}>
        Le Comité des Admissions vous remercie de l'intérêt que vous portez à Ignito
        Academy. Nous avons étudié votre dossier ({applicantId}) avec la plus grande
        attention et le plus grand soin.
      </Text>

      <Text style={s.para}>
        Le nombre de places pour notre cohorte de Septembre 2026 étant strictement
        limité, notre processus de sélection s'est révélé particulièrement compétitif
        cette année. C'est avec regret que nous ne pouvons pas, à ce stade, vous offrir
        une place au sein de notre programme.
      </Text>

      <Text style={s.para}>
        Cette décision ne remet nullement en cause vos qualités personnelles ni votre
        potentiel académique. Nous vous souhaitons une excellente continuation et
        beaucoup de succès dans vos futurs projets universitaires.
      </Text>
    </>
  )
}

// ─── Main Document ─────────────────────────────────────────────────────────────

const SUBJECT: Record<DecisionStatus, string> = {
  'Admission définitive':   "Décision d'Admission : FÉLICITATIONS",
  'Admission sous réserve': "Décision d'Admission : OFFRE CONDITIONNELLE",
  'Dossier refusé':         "Décision d'Admission : Mise à jour de votre dossier",
}

export function DecisionLetterPDF({
  applicantName,
  applicantId,
  status,
  conditionalMessage,
}: Props) {
  const subject = SUBJECT[status]
  const date    = frenchDate()

  return (
    <Document
      title={`Lettre de décision — ${applicantId}`}
      author="Bureau des Admissions — Ignito Academy"
      subject={subject}
    >
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <Image src="/ignito-logo-pdf.png" style={s.logo} />
          <View style={s.headerRight}>
            <Text style={s.bureauLabel}>Bureau des Admissions</Text>
            <Text style={s.headerDate}>{date}</Text>
            <Text style={s.headerRef}>Réf. : {applicantId}</Text>
          </View>
        </View>

        {/* ── Navy rule ── */}
        <View style={s.navyRule} />

        {/* ── Subject ── */}
        <View style={s.subjectBox}>
          <Text style={s.subjectLabel}>Objet</Text>
          <Text style={s.subjectText}>{subject}</Text>
        </View>

        {/* ── Body ── */}
        {status === 'Admission définitive' && (
          <BodyFinalAcceptance applicantName={applicantName} />
        )}
        {status === 'Admission sous réserve' && (
          <BodyConditional
            applicantName={applicantName}
            conditionalMessage={conditionalMessage ?? ''}
          />
        )}
        {status === 'Dossier refusé' && (
          <BodyRefusal applicantName={applicantName} applicantId={applicantId} />
        )}

        {/* ── Sign-off ── */}
        <View style={s.signOffSection}>
          <Text style={s.closing}>
            Dans l'attente de votre retour, nous vous prions d'agréer,{' '}
            Cher/Chère {applicantName}, l'expression de nos salutations académiques distinguées.
          </Text>

          <View style={s.signatureOuter}>
            <View style={s.signatureBlock}>
              <Image src="/signature-pdf.png" style={s.signatureImg} />
              <Text style={s.signatureName}>Tychique Lesambo</Text>
              <Text style={s.signatureTitle}>Directeur Académique</Text>
              <Text style={s.signatureOrg}>Ignito Academy</Text>
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Ignito Academy · Bureau des Admissions · Kinshasa, RDC
          </Text>
          <Text style={s.footerBrand}>ADMITTA</Text>
          <Text style={s.footerText}>
            Document officiel généré par le portail Admitta.
          </Text>
        </View>

      </Page>
    </Document>
  )
}
