'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, User, GraduationCap, CreditCard, FileText,
  Download, Loader2, CheckCircle2, Clock, AlertCircle,
  UserCheck, XCircle, ShieldCheck, ShieldX, BadgeCheck, Gavel,
  ExternalLink, Play, PaperclipIcon, History, Banknote,
  MessageSquare, Send, RefreshCw,
} from 'lucide-react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Applicant {
  prenom:         string
  nom:            string
  postnom:        string | null
  email:          string
  phone_number:   string | null
  date_naissance: string | null
  adresse_rue:    string | null
  adresse_ville:  string | null
  province:       string | null
}

interface Application {
  applicant_id:            string
  intake_year:             number
  ecole_provenance:        string | null
  option_academique:       string | null
  english_level:           string | null
  exam_status:             string | null
  application_status:      string
  payment_status:          string
  transaction_id:          string | null
  payment_confirmed_at:    string | null
  conditional_message:     string | null
  created_at:              string
  updated_at:              string
  graduation_year:         number | null
  grade_10_average:        number | null
  grade_11_average:        number | null
  grade_12_average:        number | null
  exetat_percentage:       number | null
  is_scholarship_eligible: boolean
  scholarship_video_url:   string | null
  documents_submitted:     boolean
  user_id:                 string
}

interface UploadedDoc {
  id:              string
  file_name:       string
  file_size_bytes: number
  mime_type:       string
  uploaded_at:     string
  file_path:       string
  document_type:   string | null
}

interface AuditEntry {
  id:              string
  previous_status: string | null
  new_status:      string
  notes:           string | null
  created_at:      string
  admissions_officers: { prenom: string; nom: string } | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_STATUS_LABELS: Record<string, string> = {
  'Dossier Créé':           'Dossier créé',
  'en_cours_devaluation':   "En cours d'évaluation",
  'Frais Réglés':           "En cours d'évaluation",
  'Admission sous réserve': 'Admission sous réserve',
  'Admission définitive':   'Admission définitive',
  'Dossier refusé':         'Dossier refusé',
}

const APP_STATUS_STYLE: Record<string, {
  bg: string; text: string
  icon: React.ComponentType<{ className?: string }>
}> = {
  'Dossier Créé':           { bg: 'bg-slate-100  border-slate-200',   text: 'text-slate-600',   icon: FileText   },
  'en_cours_devaluation':   { bg: 'bg-amber-50   border-amber-200',   text: 'text-amber-700',   icon: Clock      },
  'Frais Réglés':           { bg: 'bg-amber-50   border-amber-200',   text: 'text-amber-700',   icon: Clock      },
  'Admission sous réserve': { bg: 'bg-purple-50  border-purple-200',  text: 'text-purple-700',  icon: AlertCircle},
  'Admission définitive':   { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: UserCheck  },
  'Dossier refusé':         { bg: 'bg-red-50     border-red-200',     text: 'text-red-700',     icon: XCircle    },
}

const PAY_STYLE: Record<string, string> = {
  Confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Waived:    'bg-teal-50    text-teal-700    border-teal-200',
  Pending:   'bg-amber-50   text-amber-700   border-amber-200',
  Failed:    'bg-red-50     text-red-700     border-red-200',
}
const PAY_LABELS: Record<string, string> = {
  Confirmed: 'Confirmé', Waived: 'Exonéré',
  Pending:   'En attente', Failed: 'Échoué',
}

const DOC_GROUPS = [
  { key: 'id',   title: "Preuve d'Identité",           types: ["Preuve d'Identité"] },
  { key: 'dip',  title: "Diplôme d'État ou Attestation", types: ["Diplôme d'État ou Attestation"] },
  { key: 'bul',  title: 'Bulletins Scolaires',         types: ['Bulletin 10e', 'Bulletin 11e', 'Bulletin 12e'] },
  { key: 'add',  title: 'Documents Additionnels',      types: ['Document Conditionnel', 'Autre'] },
]

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const id = u.hostname.includes('youtu.be')
        ? u.pathname.slice(1)
        : u.searchParams.get('v') ?? u.pathname.split('/').pop()
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').pop()
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
    return null
  } catch { return null }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon, title, children, headerRight,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
  headerRight?: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#4EA6F5]" />
          <h3 className="font-serif text-sm font-bold text-[#021463]">{title}</h3>
        </div>
        {headerRight}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-50 py-2.5
                    last:border-0 sm:flex-row sm:items-baseline sm:gap-3">
      <span className="w-40 shrink-0 text-[11px] font-semibold uppercase
                       tracking-wider text-slate-400">
        {label}
      </span>
      <span className="text-sm font-medium text-slate-800">{value ?? '—'}</span>
    </div>
  )
}

function Feedback({
  type, message,
}: { type: 'success' | 'error'; message: string }) {
  return (
    <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
      type === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-red-200 bg-red-50 text-red-700'
    }`}>
      {type === 'success'
        ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
        : <AlertCircle  className="h-4 w-4 shrink-0 mt-0.5" />}
      {message}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded-md bg-slate-200" />
      <div className="h-24 rounded-xl bg-slate-200" />
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-48 rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="h-40 rounded-xl bg-slate-200" />
      <div className="h-56 rounded-xl bg-slate-200" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApplicationDetailPage() {
  const params      = useParams()
  const applicantId = decodeURIComponent(params.id as string)

  const [applicant,   setApplicant]   = useState<Applicant | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [documents,   setDocuments]   = useState<UploadedDoc[]>([])
  const [audit,       setAudit]       = useState<AuditEntry[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  // Decision state
  const [deciding,        setDeciding]        = useState<string | null>(null)
  const [decisionSuccess, setDecisionSuccess] = useState<string | null>(null)
  const [decisionError,   setDecisionError]   = useState<string | null>(null)
  const [condMessage,     setCondMessage]     = useState('')
  const [showCondInput,   setShowCondInput]   = useState(false)

  // Document request state
  const [docRequestMsg,     setDocRequestMsg]     = useState('')
  const [requestingDoc,     setRequestingDoc]     = useState(false)
  const [docRequestSuccess, setDocRequestSuccess] = useState<string | null>(null)
  const [docRequestError,   setDocRequestError]   = useState<string | null>(null)

  // Waive payment state
  const [waiveReason,   setWaiveReason]   = useState('')
  const [waiving,       setWaiving]       = useState(false)
  const [waiveSuccess,  setWaiveSuccess]  = useState<string | null>(null)
  const [waiveError,    setWaiveError]    = useState<string | null>(null)
  const [showWaiveForm, setShowWaiveForm] = useState(false)

  // Download state
  const [downloading, setDownloading] = useState<string | null>(null)

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { data: appData, error: appErr } = await supabase
      .from('applications')
      .select(`
        applicant_id, intake_year, ecole_provenance, option_academique,
        english_level, exam_status, application_status, payment_status,
        transaction_id, payment_confirmed_at, conditional_message,
        created_at, updated_at, graduation_year,
        grade_10_average, grade_11_average, grade_12_average,
        exetat_percentage, is_scholarship_eligible, scholarship_video_url,
        documents_submitted, user_id
      `)
      .eq('applicant_id', applicantId)
      .maybeSingle()

    if (appErr) {
      console.error('[detail] applications fetch error:', appErr)
      setError(`Erreur lors du chargement : ${appErr.message} (code: ${appErr.code})`)
      setLoading(false)
      return
    }

    if (!appData) {
      // applicant_id not found — try fetching via applicants list to confirm RLS works
      const { data: allIds } = await supabase
        .from('applications')
        .select('applicant_id')
        .limit(3)
      console.warn('[detail] no row for applicant_id:', applicantId, '— sample IDs in DB:', allIds)
      setError(`Dossier « ${applicantId} » introuvable. Identifiant incorrect ou aucun accès.`)
      setLoading(false)
      return
    }

    setApplication(appData as Application)
    setCondMessage(appData.conditional_message ?? '')

    // Applicant profile
    const { data: applicantData } = await supabase
      .from('applicants')
      .select('prenom, nom, postnom, email, phone_number, date_naissance, adresse_rue, adresse_ville, province')
      .eq('id', appData.user_id)
      .single()

    if (applicantData) setApplicant(applicantData as Applicant)

    // Documents
    const { data: docs } = await supabase
      .from('uploaded_documents')
      .select('id, file_name, file_size_bytes, mime_type, uploaded_at, file_path, document_type')
      .eq('application_id', appData.applicant_id)
      .order('uploaded_at', { ascending: true })

    setDocuments((docs ?? []) as UploadedDoc[])

    // Audit trail
    const { data: auditData } = await supabase
      .from('audit_trail')
      .select(`
        id, previous_status, new_status, notes, created_at,
        admissions_officers ( prenom, nom )
      `)
      .eq('applicant_id', applicantId)
      .order('created_at', { ascending: false })

    setAudit((auditData ?? []) as AuditEntry[])
    setLoading(false)
  }, [applicantId])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Decision ──────────────────────────────────────────────────────────────

  const handleDecision = async (
    type: 'Admission sous réserve' | 'Admission définitive' | 'Dossier refusé'
  ) => {
    setDecisionError(null)
    setDecisionSuccess(null)

    if (type === 'Admission sous réserve') {
      if (!showCondInput) { setShowCondInput(true); return }
      if (!condMessage.trim()) {
        setDecisionError("Un message explicatif est requis pour l'admission sous réserve.")
        return
      }
    }

    setDeciding(type)

    const res  = await fetch('/api/admin/decision', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ applicantId, status: type, conditionalMessage: condMessage.trim() || undefined }),
    })
    const json = await res.json()
    setDeciding(null)

    if (!res.ok || !json.success) {
      setDecisionError(json.error ?? 'Une erreur est survenue.')
      return
    }

    setApplication(prev => prev
      ? { ...prev, application_status: type, conditional_message: condMessage.trim() || null }
      : null
    )
    setDecisionSuccess({
      'Admission sous réserve': 'Admission sous réserve enregistrée.',
      'Admission définitive':   'Admission définitive accordée.',
      'Dossier refusé':         'Dossier refusé. Le candidat sera notifié.',
    }[type])
    setShowCondInput(false)
    fetchData() // refresh audit trail
    setTimeout(() => setDecisionSuccess(null), 6000)
  }

  // ── Request document ──────────────────────────────────────────────────────

  const handleRequestDocument = async () => {
    if (!docRequestMsg.trim()) {
      setDocRequestError('Veuillez décrire le document demandé.')
      return
    }
    setRequestingDoc(true)
    setDocRequestError(null)

    const res  = await fetch('/api/admin/request-document', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ applicantId, message: docRequestMsg.trim() }),
    })
    const json = await res.json()
    setRequestingDoc(false)

    if (!res.ok || !json.success) {
      setDocRequestError(json.error ?? 'Impossible d\'envoyer la demande.')
      return
    }

    setApplication(prev => prev
      ? { ...prev, conditional_message: docRequestMsg.trim() }
      : null
    )
    setDocRequestSuccess('Demande envoyée. Le candidat verra votre message sur son tableau de bord.')
    setDocRequestMsg('')
    fetchData()
    setTimeout(() => setDocRequestSuccess(null), 6000)
  }

  // ── Waive payment ─────────────────────────────────────────────────────────

  const handleWaivePayment = async () => {
    if (!waiveReason.trim()) {
      setWaiveError('Veuillez indiquer la raison de l\'exonération.')
      return
    }
    setWaiving(true)
    setWaiveError(null)

    const res  = await fetch('/api/admin/waive-payment', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ applicantId, reason: waiveReason.trim() }),
    })
    const json = await res.json()
    setWaiving(false)

    if (!res.ok || !json.success) {
      setWaiveError(json.error ?? 'Impossible d\'exonérer ce dossier.')
      return
    }

    setApplication(prev => prev ? { ...prev, payment_status: 'Waived' } : null)
    setWaiveSuccess('Paiement exonéré avec succès. Le candidat peut désormais soumettre son dossier.')
    setShowWaiveForm(false)
    setWaiveReason('')
    fetchData()
    setTimeout(() => setWaiveSuccess(null), 8000)
  }

  // ── Document download ─────────────────────────────────────────────────────

  const handleDownload = async (doc: UploadedDoc) => {
    setDownloading(doc.id)
    const res = await fetch('/api/admin/document-url', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ filePath: doc.file_path }),
    })
    if (!res.ok) { setDownloading(null); alert('Lien de téléchargement indisponible.'); return }
    const { url } = await res.json()
    window.open(url, '_blank', 'noopener,noreferrer')
    setDownloading(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <Skeleton />

  if (error || !application) {
    return (
      <div className="flex flex-col items-start gap-4 py-16 max-w-lg">
        <AlertCircle className="h-10 w-10 text-slate-300" />
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-1">
            Impossible de charger ce dossier
          </p>
          <p className="text-sm text-slate-500 leading-relaxed">
            {error ?? 'Dossier introuvable.'}
          </p>
          <p className="mt-2 text-xs font-mono text-slate-400">
            ID recherché : {applicantId}
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-medium
                     text-[#4EA6F5] transition-colors hover:text-[#021463]"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </Link>
      </div>
    )
  }

  const statusStyle = APP_STATUS_STYLE[application.application_status]
    ?? APP_STATUS_STYLE['Dossier Créé']
  const StatusIcon  = statusStyle.icon
  const embedUrl    = application.scholarship_video_url
    ? toEmbedUrl(application.scholarship_video_url)
    : null

  const isPaid  = application.payment_status === 'Confirmed' || application.payment_status === 'Waived'
  const isLocked = application.application_status === 'Admission définitive' ||
                   application.application_status === 'Dossier refusé'

  return (
    <div className="space-y-6">

      {/* ── Back + ID + refresh ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-medium
                     text-[#4EA6F5] transition-colors hover:text-[#021463]"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 rounded-md border border-slate-200
                       px-2.5 py-1.5 text-xs text-slate-500 transition-colors
                       hover:bg-slate-50 hover:text-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Actualiser
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Identifiant
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono
                             text-sm font-bold text-[#021463]">
              {application.applicant_id}
            </span>
          </div>
        </div>
      </div>

      {/* ── Header card ── */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200
                      bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#021463]">
            {applicant?.prenom}{applicant?.postnom ? ` ${applicant.postnom}` : ''} {applicant?.nom}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Rentrée {application.intake_year}
            {applicant?.email && <span className="text-slate-400"> · {applicant.email}</span>}
            {applicant?.phone_number && <span className="text-slate-400"> · {applicant.phone_number}</span>}
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2
                         ${statusStyle.bg} ${statusStyle.text}`}>
          <StatusIcon className="h-4 w-4" />
          <span className="text-sm font-semibold">
            {APP_STATUS_LABELS[application.application_status] ?? application.application_status}
          </span>
        </div>
      </div>

      {/* ── Waive success banner ── */}
      {waiveSuccess && <Feedback type="success" message={waiveSuccess} />}

      {/* ── Scholarship badge ── */}
      {application.is_scholarship_eligible && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <BadgeCheck className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800">Candidat à la Bourse d&apos;Excellence</p>
            <p className="text-xs text-amber-600">
              {application.scholarship_video_url
                ? 'Vidéo de présentation soumise — en attente d\'évaluation.'
                : 'Aucune vidéo soumise pour l\'instant.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Active document request banner ── */}
      {application.conditional_message && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
            Demande de document active
          </p>
          <p className="text-sm text-blue-800 leading-relaxed">
            {application.conditional_message}
          </p>
        </div>
      )}

      {/* ── 2-col info grid ── */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Personal */}
        <SectionCard icon={User} title="Informations Personnelles">
          <InfoRow label="Prénom"            value={applicant?.prenom} />
          <InfoRow label="Postnom"           value={applicant?.postnom} />
          <InfoRow label="Nom"               value={applicant?.nom} />
          <InfoRow label="Email"             value={applicant?.email} />
          <InfoRow label="Téléphone"         value={applicant?.phone_number} />
          <InfoRow label="Date de naissance"
            value={applicant?.date_naissance
              ? new Date(applicant.date_naissance).toLocaleDateString('fr-FR')
              : null}
          />
          <InfoRow label="Ville"             value={applicant?.adresse_ville} />
          <InfoRow label="Province"          value={applicant?.province} />
        </SectionCard>

        {/* Academic */}
        <SectionCard icon={GraduationCap} title="Informations Académiques">
          <InfoRow label="École"           value={application.ecole_provenance} />
          <InfoRow label="Option"          value={application.option_academique} />
          <InfoRow label="Année diplôme"   value={application.graduation_year?.toString()} />
          <InfoRow label="Examen d'État"   value={application.exam_status} />
          <InfoRow label="Niveau d'anglais" value={application.english_level} />
          <InfoRow label="% Exetat"
            value={application.exetat_percentage != null
              ? `${application.exetat_percentage}%`
              : null}
          />
        </SectionCard>

        {/* Grades */}
        <SectionCard icon={FileText} title="Moyennes Scolaires">
          <InfoRow label="10e année"
            value={application.grade_10_average != null ? `${application.grade_10_average}%` : null}
          />
          <InfoRow label="11e année"
            value={application.grade_11_average != null ? `${application.grade_11_average}%` : null}
          />
          <InfoRow label="12e année"
            value={application.grade_12_average != null ? `${application.grade_12_average}%` : null}
          />
          <div className="mt-3 flex items-center gap-2 border-t border-slate-50 pt-3">
            <span className="w-40 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Éligibilité bourse
            </span>
            {application.is_scholarship_eligible ? (
              <span className="inline-flex items-center gap-1 rounded border border-amber-300
                               bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                <BadgeCheck className="h-3 w-3" /> Éligible
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded border border-slate-200
                               bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                Non éligible
              </span>
            )}
          </div>
        </SectionCard>

        {/* Payment */}
        <SectionCard
          icon={CreditCard}
          title="Paiement"
          headerRight={
            !isPaid && (
              <button
                onClick={() => setShowWaiveForm(v => !v)}
                className="inline-flex items-center gap-1.5 rounded-md border border-teal-200
                           bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700
                           transition-colors hover:bg-teal-100"
              >
                <Banknote className="h-3 w-3" />
                Exonérer
              </button>
            )
          }
        >
          <div className="flex items-center gap-2 border-b border-slate-50 py-2.5">
            <span className="w-40 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Statut
            </span>
            <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border
                              ${PAY_STYLE[application.payment_status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {PAY_LABELS[application.payment_status] ?? application.payment_status}
            </span>
          </div>
          <InfoRow label="Transaction ID" value={application.transaction_id} />
          <InfoRow label="Confirmé le"
            value={application.payment_confirmed_at
              ? new Date(application.payment_confirmed_at).toLocaleString('fr-FR')
              : null}
          />

          {/* Waive form */}
          {showWaiveForm && (
            <div className="mt-4 space-y-3 rounded-lg border border-teal-200 bg-teal-50 p-4">
              <p className="text-xs font-semibold text-teal-800">
                Exonération de paiement — Raison (obligatoire)
              </p>
              <input
                type="text"
                value={waiveReason}
                onChange={e => setWaiveReason(e.target.value)}
                placeholder="Ex : Bourse accordée, cas social, dispense directeur…"
                className="w-full rounded-lg border border-teal-200 bg-white px-3 py-2
                           text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              {waiveError && <p className="text-xs text-red-600">{waiveError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleWaivePayment}
                  disabled={waiving}
                  className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-4 py-2
                             text-xs font-semibold text-white transition-colors
                             hover:bg-teal-700 disabled:opacity-50"
                >
                  {waiving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Banknote className="h-3.5 w-3.5" />}
                  Confirmer l&apos;exonération
                </button>
                <button
                  onClick={() => { setShowWaiveForm(false); setWaiveReason(''); setWaiveError(null) }}
                  className="rounded-md px-3 py-2 text-xs text-slate-500 hover:underline"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Documents ── */}
      <SectionCard icon={FileText} title="Documents Soumis">
        {documents.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun document soumis pour l&apos;instant.</p>
        ) : (
          <div className="space-y-6">
            {DOC_GROUPS.map(group => {
              const groupDocs = documents.filter(d => group.types.includes(d.document_type ?? ''))
              if (groupDocs.length === 0) return null
              return (
                <div key={group.key}>
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">{group.title}</h4>
                  <div className="space-y-2">
                    {groupDocs.map(doc => (
                      <div key={doc.id}
                           className="flex items-center justify-between rounded-lg
                                      border border-slate-100 bg-slate-50 p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">{doc.file_name}</p>
                            <p className="text-xs text-slate-400">
                              {(doc.file_size_bytes / 1024).toFixed(0)} Ko ·{' '}
                              {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownload(doc)}
                          disabled={downloading === doc.id}
                          className="flex items-center gap-1.5 rounded-md px-3 py-1.5
                                     text-xs font-medium text-[#4EA6F5]
                                     transition-colors hover:bg-blue-50 hover:text-[#021463]
                                     disabled:opacity-50"
                        >
                          {downloading === doc.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Download className="h-3.5 w-3.5" />}
                          Télécharger
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      {/* ── Request extra document ── */}
      <SectionCard icon={PaperclipIcon} title="Demander un Document Complémentaire">
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-slate-500">
            Envoyez un message au candidat pour lui demander de soumettre un document
            supplémentaire. Il verra ce message sur son tableau de bord et pourra
            téléverser le document dans la section &quot;Documents Additionnels&quot;.
          </p>

          {/* Active request display */}
          {application.conditional_message && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-blue-500">
                Demande en cours
              </p>
              <p className="text-sm text-blue-800">{application.conditional_message}</p>
            </div>
          )}

          {docRequestSuccess && <Feedback type="success" message={docRequestSuccess} />}
          {docRequestError   && <Feedback type="error"   message={docRequestError} />}

          <div className="flex gap-3">
            <textarea
              value={docRequestMsg}
              onChange={e => setDocRequestMsg(e.target.value)}
              rows={3}
              placeholder="Ex : Veuillez soumettre votre Diplôme d'État officiel (copie certifiée conforme)…"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm
                         focus:border-[#4EA6F5] focus:outline-none focus:ring-2 focus:ring-[#4EA6F5]/30"
            />
          </div>
          <button
            onClick={handleRequestDocument}
            disabled={requestingDoc || !docRequestMsg.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-[#021463] px-4 py-2.5
                       text-sm font-semibold text-white transition-colors
                       hover:bg-[#021463]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {requestingDoc
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
            Envoyer la demande
          </button>
        </div>
      </SectionCard>

      {/* ── Scholarship video ── */}
      {application.scholarship_video_url && (
        <SectionCard icon={Play} title="Vidéo de Présentation — Bourse d'Excellence">
          <div className="space-y-4">
            {embedUrl ? (
              <div className="overflow-hidden rounded-lg shadow-sm">
                <div className="aspect-video w-full">
                  <iframe
                    src={embedUrl}
                    className="h-full w-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 py-10">
                <p className="text-sm text-slate-400">Aperçu indisponible</p>
              </div>
            )}
            <a
              href={application.scholarship_video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-[#4EA6F5]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ouvrir dans un nouvel onglet
            </a>
          </div>
        </SectionCard>
      )}

      {/* ── Decision section ── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
          <Gavel className="h-4 w-4 text-[#4EA6F5]" />
          <h3 className="font-serif text-sm font-bold text-[#021463]">Rendre une Décision</h3>
        </div>
        <div className="space-y-4 p-6">

          {isLocked && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200
                            bg-slate-50 p-3 text-sm text-slate-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Ce dossier a reçu une décision finale. Vous pouvez la modifier ci-dessous si nécessaire.
            </div>
          )}

          {decisionSuccess && <Feedback type="success" message={decisionSuccess} />}
          {decisionError   && <Feedback type="error"   message={decisionError} />}

          {/* Conditional message input */}
          {showCondInput && (
            <div className="space-y-3 rounded-lg border border-purple-200 bg-purple-50 p-4">
              <label className="block text-sm font-semibold text-purple-800">
                Message conditionnel pour le candidat *
              </label>
              <p className="text-xs text-purple-600">
                Décrivez les documents manquants ou les conditions à remplir.
                Ce message sera visible directement sur le tableau de bord du candidat.
              </p>
              <textarea
                value={condMessage}
                onChange={e => setCondMessage(e.target.value)}
                rows={3}
                placeholder="Ex : Votre dossier est accepté sous réserve de la soumission de votre Diplôme d'État officiel…"
                className="w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button
                onClick={() => setShowCondInput(false)}
                className="text-xs text-purple-500 hover:underline"
              >
                Annuler
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleDecision('Admission sous réserve')}
              disabled={deciding !== null}
              className="inline-flex items-center justify-center gap-2 rounded-md
                         bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white
                         transition-colors hover:bg-purple-700
                         disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deciding === 'Admission sous réserve'
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <ShieldCheck className="h-4 w-4" />}
              Admission sous réserve
            </button>

            <button
              onClick={() => handleDecision('Admission définitive')}
              disabled={deciding !== null || application.application_status === 'Admission définitive'}
              className="inline-flex items-center justify-center gap-2 rounded-md
                         bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white
                         transition-colors hover:bg-emerald-700
                         disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deciding === 'Admission définitive'
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <UserCheck className="h-4 w-4" />}
              Admission définitive
            </button>

            <button
              onClick={() => handleDecision('Dossier refusé')}
              disabled={deciding !== null || application.application_status === 'Dossier refusé'}
              className="inline-flex items-center justify-center gap-2 rounded-md
                         bg-red-600 px-4 py-2.5 text-sm font-semibold text-white
                         transition-colors hover:bg-red-700
                         disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deciding === 'Dossier refusé'
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <ShieldX className="h-4 w-4" />}
              Refuser le dossier
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            Chaque décision est enregistrée dans le journal d&apos;audit ci-dessous.
          </p>
        </div>
      </div>

      {/* ── Audit trail ── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
          <History className="h-4 w-4 text-[#4EA6F5]" />
          <h3 className="font-serif text-sm font-bold text-[#021463]">Journal d&apos;Activité</h3>
          <span className="ml-auto rounded bg-slate-100 px-2 py-0.5 text-[11px]
                           font-bold text-slate-500">
            {audit.length} entrée{audit.length !== 1 ? 's' : ''}
          </span>
        </div>

        {audit.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <MessageSquare className="h-7 w-7 text-slate-200" />
            <p className="text-sm text-slate-400">Aucune action enregistrée pour ce dossier.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 px-6">
            {audit.map((entry, idx) => {
              const prevStyle = entry.previous_status
                ? APP_STATUS_STYLE[entry.previous_status] ?? APP_STATUS_STYLE['Dossier Créé']
                : null
              const newStyle  = APP_STATUS_STYLE[entry.new_status] ?? APP_STATUS_STYLE['Dossier Créé']
              const officerName = entry.admissions_officers
                ? `${entry.admissions_officers.prenom} ${entry.admissions_officers.nom}`
                : 'Administrateur'

              return (
                <div key={entry.id} className="flex gap-4 py-4">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center pt-0.5">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center
                                    rounded-md ${newStyle.bg} border ${newStyle.text}`}>
                      <Gavel className="h-3.5 w-3.5" />
                    </div>
                    {idx < audit.length - 1 && (
                      <div className="mt-1 w-px flex-1 bg-slate-100" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {prevStyle && entry.previous_status !== entry.new_status && (
                        <>
                          <span className={`inline-flex items-center rounded px-2 py-0.5
                                           text-[11px] font-medium border ${prevStyle.bg} ${prevStyle.text}`}>
                            {APP_STATUS_LABELS[entry.previous_status!] ?? entry.previous_status}
                          </span>
                          <span className="text-slate-300 text-xs">→</span>
                        </>
                      )}
                      <span className={`inline-flex items-center rounded px-2 py-0.5
                                       text-[11px] font-medium border ${newStyle.bg} ${newStyle.text}`}>
                        {APP_STATUS_LABELS[entry.new_status] ?? entry.new_status}
                      </span>
                    </div>

                    {entry.notes && (
                      <p className="text-xs leading-relaxed text-slate-600 mb-1">
                        {entry.notes}
                      </p>
                    )}

                    <p className="text-[11px] text-slate-400">
                      {officerName} ·{' '}
                      {new Date(entry.created_at).toLocaleString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Metadata ── */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400 pb-4">
        <span>Dossier créé le {new Date(application.created_at).toLocaleString('fr-FR')}</span>
        <span>Dernière modification {new Date(application.updated_at).toLocaleString('fr-FR')}</span>
      </div>
    </div>
  )
}
