'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, User, GraduationCap, CreditCard, FileText,
  Download, Loader2, CheckCircle2, Clock, AlertCircle,
  UserCheck, XCircle, ShieldCheck, ShieldX, BadgeCheck, Gavel,
  ExternalLink, Play,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Applicant {
  prenom:          string
  nom:             string
  postnom:         string | null
  email:           string
  phone_number:    string | null
  date_naissance:  string | null
  adresse_rue:     string | null
  adresse_ville:   string | null
  province:        string | null
}

interface Application {
  applicant_id:           string
  intake_year:            number
  ecole_provenance:       string | null
  option_academique:      string | null
  english_level:          string | null
  exam_status:            string | null
  application_status:     string
  payment_status:         string
  transaction_id:         string | null
  payment_confirmed_at:   string | null
  conditional_message:    string | null
  created_at:             string
  updated_at:             string
  graduation_year:        number | null
  grade_10_average:       number | null
  grade_11_average:       number | null
  grade_12_average:       number | null
  exetat_percentage:      number | null
  is_scholarship_eligible: boolean
  scholarship_video_url:  string | null
  documents_submitted:    boolean
  user_id:                string
}

interface UploadedDoc {
  id:               string
  file_name:        string
  file_size_bytes:  number
  mime_type:        string
  uploaded_at:      string
  file_path:        string
  document_type:    string | null
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

const APP_STATUS_STYLE: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  'Dossier Créé':           { bg: 'bg-slate-100  border-slate-200',   text: 'text-slate-600',   icon: FileText },
  'en_cours_devaluation':   { bg: 'bg-amber-50   border-amber-200',   text: 'text-amber-700',   icon: Clock },
  'Frais Réglés':           { bg: 'bg-amber-50   border-amber-200',   text: 'text-amber-700',   icon: Clock },
  'Admission sous réserve': { bg: 'bg-purple-50  border-purple-200',  text: 'text-purple-700',  icon: AlertCircle },
  'Admission définitive':   { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: UserCheck },
  'Dossier refusé':         { bg: 'bg-red-50     border-red-200',     text: 'text-red-700',     icon: XCircle },
}

const PAY_STYLE: Record<string, string> = {
  Confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Waived:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  Pending:   'bg-amber-50   text-amber-700   border-amber-200',
  Failed:    'bg-red-50     text-red-700     border-red-200',
}
const PAY_LABELS: Record<string, string> = {
  Confirmed: 'Confirmé', Waived: 'Exonéré',
  Pending:   'En attente', Failed: 'Échoué',
}

const DOC_GROUPS = [
  {
    key:   'identification',
    title: "Preuve d'Identité",
    types: ["Preuve d'Identité"],
  },
  {
    key:   'diploma',
    title: "Diplôme d'État ou Attestation",
    types: ["Diplôme d'État ou Attestation"],
  },
  {
    key:   'bulletins',
    title: 'Bulletins Scolaires',
    types: ['Bulletin 10e', 'Bulletin 11e', 'Bulletin 12e'],
  },
  {
    key:   'additional',
    title: 'Documents Additionnels',
    types: ['Document Conditionnel', 'Autre'],
  },
]

// Converts YouTube/Vimeo URL to embed URL
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
  } catch {
    return null
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon, title, children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
        <Icon className="h-4 w-4 text-[#4EA6F5]" />
        <h3 className="font-serif text-sm font-bold text-[#021463]">{title}</h3>
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
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApplicationDetailPage() {
  const router    = useRouter()
  const params    = useParams()
  const applicantId = decodeURIComponent(params.id as string)

  const [applicant,   setApplicant]   = useState<Applicant | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [documents,   setDocuments]   = useState<UploadedDoc[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  // Decision state
  const [deciding,        setDeciding]        = useState<string | null>(null)
  const [decisionSuccess, setDecisionSuccess] = useState<string | null>(null)
  const [decisionError,   setDecisionError]   = useState<string | null>(null)
  const [condMessage,     setCondMessage]     = useState('')
  const [showCondInput,   setShowCondInput]   = useState(false)

  // Document download state
  const [downloading, setDownloading] = useState<string | null>(null)

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { data: appData, error: appErr } = await supabase
      .from('applications')
      .select(`
        applicant_id,
        intake_year,
        ecole_provenance,
        option_academique,
        english_level,
        exam_status,
        application_status,
        payment_status,
        transaction_id,
        payment_confirmed_at,
        conditional_message,
        created_at,
        updated_at,
        graduation_year,
        grade_10_average,
        grade_11_average,
        grade_12_average,
        exetat_percentage,
        is_scholarship_eligible,
        scholarship_video_url,
        documents_submitted,
        user_id
      `)
      .eq('applicant_id', applicantId)
      .single()

    if (appErr || !appData) {
      setError('Dossier introuvable ou accès refusé.')
      setLoading(false)
      return
    }

    setApplication(appData as Application)
    setCondMessage(appData.conditional_message ?? '')

    // Fetch applicant profile
    const { data: applicantData } = await supabase
      .from('applicants')
      .select('prenom, nom, postnom, email, phone_number, date_naissance, adresse_rue, adresse_ville, province')
      .eq('id', appData.user_id)
      .single()

    if (applicantData) setApplicant(applicantData as Applicant)

    // Fetch documents
    const { data: docs } = await supabase
      .from('uploaded_documents')
      .select('id, file_name, file_size_bytes, mime_type, uploaded_at, file_path, document_type')
      .eq('application_id', appData.applicant_id)
      .order('uploaded_at', { ascending: true })

    setDocuments((docs ?? []) as UploadedDoc[])
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
        setDecisionError("Un message pour le candidat est obligatoire pour l'admission sous réserve.")
        return
      }
    }

    setDeciding(type)

    const res = await fetch('/api/admin/decision', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicantId,
        status:             type,
        conditionalMessage: condMessage.trim() || undefined,
      }),
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

    const labels: Record<string, string> = {
      'Admission sous réserve': 'Admission sous réserve accordée.',
      'Admission définitive':   'Admission définitive accordée.',
      'Dossier refusé':         'Dossier refusé. Le candidat sera notifié.',
    }
    setDecisionSuccess(labels[type])
    setShowCondInput(false)
    setTimeout(() => setDecisionSuccess(null), 6000)
  }

  // ── Document download ─────────────────────────────────────────────────────

  const handleDownload = async (doc: UploadedDoc) => {
    setDownloading(doc.id)

    const res = await fetch('/api/admin/document-url', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ filePath: doc.file_path }),
    })

    if (!res.ok) {
      setDownloading(null)
      alert('Impossible de générer le lien de téléchargement.')
      return
    }

    const { url } = await res.json()
    window.open(url, '_blank', 'noopener,noreferrer')
    setDownloading(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <Skeleton />

  if (error || !application) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertCircle className="h-10 w-10 text-slate-300" />
        <p className="text-sm text-slate-500">{error ?? 'Dossier introuvable.'}</p>
        <Link href="/admin" className="text-xs text-[#4EA6F5] hover:underline">
          ← Retour à la liste
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

  return (
    <div className="space-y-6">

      {/* ── Back + ID ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-medium
                     text-[#4EA6F5] transition-colors hover:text-[#021463]"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </Link>
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

      {/* ── Header card ── */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200
                      bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#021463]">
            {applicant?.prenom} {applicant?.postnom ? `${applicant.postnom} ` : ''}{applicant?.nom}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Rentrée {application.intake_year}
            {applicant?.email && (
              <span className="text-slate-400"> · {applicant.email}</span>
            )}
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

      {/* ── Scholarship eligible banner ── */}
      {application.is_scholarship_eligible && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200
                        bg-amber-50 p-4">
          <div className="flex h-10 w-10 items-center justify-center
                          rounded-lg bg-amber-100">
            <BadgeCheck className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800">
              Candidat à la Bourse d&apos;Excellence
            </p>
            <p className="text-xs text-amber-600">
              Ce candidat remplit les critères académiques d&apos;éligibilité à la bourse.
              {application.scholarship_video_url
                ? ' Vidéo de présentation soumise.'
                : ' Aucune vidéo soumise pour l\'instant.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Conditional message banner ── */}
      {application.application_status === 'Admission sous réserve' &&
       application.conditional_message && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 mb-1">
            Message conditionnel envoyé au candidat
          </p>
          <p className="text-sm text-purple-800 leading-relaxed">
            {application.conditional_message}
          </p>
        </div>
      )}

      {/* ── 2-col info grid ── */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Personal */}
        <SectionCard icon={User} title="Informations Personnelles">
          <InfoRow label="Prénom"           value={applicant?.prenom} />
          <InfoRow label="Postnom"          value={applicant?.postnom} />
          <InfoRow label="Nom"              value={applicant?.nom} />
          <InfoRow label="Email"            value={applicant?.email} />
          <InfoRow label="Téléphone"        value={applicant?.phone_number} />
          <InfoRow label="Date de naissance"
            value={applicant?.date_naissance
              ? new Date(applicant.date_naissance).toLocaleDateString('fr-FR')
              : null}
          />
          <InfoRow label="Ville"            value={applicant?.adresse_ville} />
          <InfoRow label="Province"         value={applicant?.province} />
        </SectionCard>

        {/* Academic */}
        <SectionCard icon={GraduationCap} title="Informations Académiques">
          <InfoRow label="École"              value={application.ecole_provenance} />
          <InfoRow label="Option"             value={application.option_academique} />
          <InfoRow label="Année diplôme"      value={application.graduation_year?.toString()} />
          <InfoRow label="Examen d'État"      value={application.exam_status} />
          <InfoRow label="Niveau d'anglais"   value={application.english_level} />
          <InfoRow label="% Exetat"
            value={application.exetat_percentage != null
              ? `${application.exetat_percentage}%`
              : null}
          />
        </SectionCard>

        {/* Grades */}
        <SectionCard icon={FileText} title="Moyennes Scolaires">
          <InfoRow label="10e année"
            value={application.grade_10_average != null
              ? `${application.grade_10_average}%`
              : null}
          />
          <InfoRow label="11e année"
            value={application.grade_11_average != null
              ? `${application.grade_11_average}%`
              : null}
          />
          <InfoRow label="12e année"
            value={application.grade_12_average != null
              ? `${application.grade_12_average}%`
              : null}
          />
          {/* Scholarship eligibility bar */}
          <div className="mt-3 flex items-center gap-2 border-t border-slate-50 pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 w-40 shrink-0">
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
        <SectionCard icon={CreditCard} title="Paiement">
          <div className="flex items-center gap-2 py-2.5 border-b border-slate-50">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 w-40 shrink-0">
              Statut
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border
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
        </SectionCard>
      </div>

      {/* ── Documents ── */}
      <SectionCard icon={FileText} title="Documents Soumis">
        {documents.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun document soumis pour l&apos;instant.</p>
        ) : (
          <div className="space-y-6">
            {DOC_GROUPS.map(group => {
              const groupDocs = documents.filter(d =>
                group.types.includes(d.document_type ?? '')
              )
              if (groupDocs.length === 0) return null
              return (
                <div key={group.key}>
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">
                    {group.title}
                  </h4>
                  <div className="space-y-2">
                    {groupDocs.map(doc => (
                      <div key={doc.id}
                           className="flex items-center justify-between rounded-lg
                                      border border-slate-100 bg-slate-50 p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {doc.file_name}
                            </p>
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
                    allow="accelerometer; autoplay; clipboard-write;
                           encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-lg
                              border border-slate-200 bg-slate-50 py-10">
                <p className="text-sm text-slate-400">Aperçu indisponible</p>
              </div>
            )}
            <a
              href={application.scholarship_video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400
                         transition-colors hover:text-[#4EA6F5]"
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
          <h3 className="font-serif text-sm font-bold text-[#021463]">
            Rendre une Décision
          </h3>
        </div>
        <div className="space-y-4 p-6">

          {decisionSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200
                            bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {decisionSuccess}
            </div>
          )}
          {decisionError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200
                            bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {decisionError}
            </div>
          )}

          {/* Conditional message textarea */}
          {showCondInput && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
              <label className="mb-2 block text-sm font-semibold text-purple-800">
                Message pour le candidat (documents manquants, conditions…)
              </label>
              <textarea
                value={condMessage}
                onChange={e => setCondMessage(e.target.value)}
                rows={3}
                placeholder="Ex : Veuillez soumettre votre Diplôme d'État une fois obtenu…"
                className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button
                onClick={() => setShowCondInput(false)}
                className="mt-2 text-xs text-purple-500 hover:underline"
              >
                Annuler
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleDecision('Admission sous réserve')}
              disabled={deciding !== null || application.application_status === 'Admission sous réserve'}
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
            Une notification sera envoyée au candidat après chaque décision.
          </p>
        </div>
      </div>

      {/* ── Metadata ── */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
        <span>Créé le {new Date(application.created_at).toLocaleString('fr-FR')}</span>
        <span>Mis à jour le {new Date(application.updated_at).toLocaleString('fr-FR')}</span>
      </div>
    </div>
  )
}
