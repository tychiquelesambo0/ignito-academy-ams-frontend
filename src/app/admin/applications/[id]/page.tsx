'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, User, GraduationCap, CreditCard, FileText,
  Download, Loader2, CheckCircle2, Clock, AlertCircle,
  RefreshCw, Lock, UserCheck, XCircle, LogOut, ShieldCheck,
  ShieldX, BadgeCheck, Gavel, Check,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Applicant {
  prenom: string; nom: string; email: string
  phone_number: string; date_naissance: string
}

interface Application {
  applicant_id: string; intake_year: number
  ecole_provenance: string; option_academique: string
  exam_status: string; application_status: string
  payment_status: string; transaction_id: string | null
  payment_confirmed_at: string | null; conditional_message: string | null
  version: number; created_at: string; updated_at: string
  graduation_year: number | null
  grade_10_average: number | null
  grade_11_average: number | null
  grade_12_average: number | null
  exetat_percentage: number | null
  is_scholarship_eligible: boolean
  scholarship_status: string
  scholarship_video_url: string | null
}

interface UploadedDoc {
  id: string; file_name: string; file_size_bytes: number
  mime_type: string; uploaded_at: string
  file_path: string; document_type: string | null
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_APPLICANT: Applicant = {
  prenom: 'Jean',
  nom: 'Kabila',
  email: 'jean.kabila@email.com',
  phone_number: '+243 812 345 678',
  date_naissance: '2004-05-15',
}

const MOCK_APPLICATION: Application = {
  applicant_id: 'IA-2026-001234',
  intake_year: 2026,
  ecole_provenance: 'Lycée Bosangani',
  option_academique: 'Sciences Physiques',
  exam_status: 'Diplôme obtenu',
  application_status: 'en_cours_devaluation',
  payment_status: 'paid',
  transaction_id: 'TXN-2026-ABC123',
  payment_confirmed_at: '2026-01-15T12:30:00Z',
  conditional_message: null,
  version: 1,
  created_at: '2026-01-15T10:30:00Z',
  updated_at: '2026-01-15T12:30:00Z',
  graduation_year: 2025,
  grade_10_average: 75.5,
  grade_11_average: 78.2,
  grade_12_average: 82.0,
  exetat_percentage: 85.0,
  is_scholarship_eligible: true,
  scholarship_status: 'pending',
  scholarship_video_url: null,
}

const MOCK_DOCUMENTS: UploadedDoc[] = [
  {
    id: '1',
    file_name: 'carte_identite.pdf',
    file_size_bytes: 245000,
    mime_type: 'application/pdf',
    uploaded_at: '2026-01-15T10:35:00Z',
    file_path: 'documents/IA-2026-001234/carte_identite.pdf',
    document_type: 'identification',
  },
  {
    id: '2',
    file_name: 'diplome_etat.pdf',
    file_size_bytes: 520000,
    mime_type: 'application/pdf',
    uploaded_at: '2026-01-15T10:40:00Z',
    file_path: 'documents/IA-2026-001234/diplome_etat.pdf',
    document_type: 'diploma',
  },
  {
    id: '3',
    file_name: 'bulletin_10.pdf',
    file_size_bytes: 180000,
    mime_type: 'application/pdf',
    uploaded_at: '2026-01-15T10:45:00Z',
    file_path: 'documents/IA-2026-001234/bulletin_10.pdf',
    document_type: 'bulletin_10',
  },
  {
    id: '4',
    file_name: 'bulletin_11.pdf',
    file_size_bytes: 175000,
    mime_type: 'application/pdf',
    uploaded_at: '2026-01-15T10:50:00Z',
    file_path: 'documents/IA-2026-001234/bulletin_11.pdf',
    document_type: 'bulletin_11',
  },
  {
    id: '5',
    file_name: 'bulletin_12.pdf',
    file_size_bytes: 190000,
    mime_type: 'application/pdf',
    uploaded_at: '2026-01-15T10:55:00Z',
    file_path: 'documents/IA-2026-001234/bulletin_12.pdf',
    document_type: 'bulletin_12',
  },
]

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
  identification:        "Preuve d'Identité",
  diploma:               "Diplôme d'État ou Attestation",
  bulletin_10:           'Bulletin de la 10e année',
  bulletin_11:           'Bulletin de la 11e année',
  bulletin_12:           'Bulletin de la 12e année',
  document_conditionnel: 'Document additionnel',
  other:                 'Autre document',
}

const DOC_GROUPS = [
  {
    key:   'identification',
    title: "Preuve d'Identité",
    desc:  "Carte d'électeur, passeport, attestation ou acte de naissance.",
    types: ['identification'],
  },
  {
    key:   'diploma',
    title: "Diplôme d'État ou Attestation",
    desc:  'Copie officielle de votre diplôme ou attestation de réussite.',
    types: ['diploma'],
  },
  {
    key:   'bulletins',
    title: 'Historique Scolaire (Bulletins)',
    desc:  'Bulletins de notes pour les 3 dernières années du secondaire.',
    types: ['bulletin_10', 'bulletin_11', 'bulletin_12'],
  },
  {
    key:   'additional',
    title: 'Documents Additionnels',
    desc:  'Documents soumis suite à une demande de compléments de dossier.',
    types: ['document_conditionnel'],
  },
]

const STATUS_OPTIONS = [
  { value: 'Admission sous réserve', label: 'Admission sous réserve' },
  { value: 'Admission définitive',   label: 'Admission définitive' },
  { value: 'Dossier refusé',         label: 'Dossier refusé' },
]

const APP_STATUS_LABELS: Record<string, string> = {
  'Dossier Créé':           'Dossier créé',
  'en_cours_devaluation':   "En cours d'évaluation",
  'Frais Réglés':           "En cours d'évaluation",
  'Admission sous réserve': 'Admission sous réserve',
  'Admission définitive':   'Admission définitive',
  'Dossier refusé':         'Dossier refusé',
}

const APP_STATUS_STYLE: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  'Dossier Créé':           { bg: 'bg-slate-100  border-slate-200',   text: 'text-slate-600',  icon: FileText },
  'en_cours_devaluation':   { bg: 'bg-amber-50   border-amber-200',   text: 'text-amber-700',  icon: Clock },
  'Frais Réglés':           { bg: 'bg-amber-50   border-amber-200',   text: 'text-amber-700',  icon: Clock },
  'Admission sous réserve': { bg: 'bg-purple-50  border-purple-200',  text: 'text-purple-700', icon: AlertCircle },
  'Admission définitive':   { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700',icon: UserCheck },
  'Dossier refusé':         { bg: 'bg-red-50     border-red-200',     text: 'text-red-700',    icon: XCircle },
}

const PAY_STYLE: Record<string, string> = {
  paid:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  Confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Pending:   'bg-amber-50   text-amber-700   border-amber-200',
  Failed:    'bg-red-50     text-red-700     border-red-200',
}
const PAY_LABELS: Record<string, string> = {
  paid: 'Payé', Confirmed: 'Confirmé', Pending: 'En attente', Failed: 'Échoué',
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, children }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
        <Icon className="w-4 h-4 text-[#4EA6F5]" />
        <h3 className="font-serif text-sm font-bold text-[#021463]">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-40 flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-800 font-medium">{value ?? '—'}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApplicationDetailPage() {
  const router   = useRouter()
  const params   = useParams()
  const applicantId = decodeURIComponent(params.id as string)

  const [applicant,    setApplicant]    = useState<Applicant | null>(null)
  const [application,  setApplication]  = useState<Application | null>(null)
  const [documents,    setDocuments]    = useState<UploadedDoc[]>([])
  const [loading,      setLoading]      = useState(true)

  // Status update state (manual dropdown)
  const [selectedStatus,  setSelectedStatus]  = useState<string>('')
  const [isUpdating,      setIsUpdating]      = useState(false)
  const [updateSuccess,   setUpdateSuccess]   = useState(false)
  const [updateError,     setUpdateError]     = useState<string | null>(null)

  // Decision action state
  const [decidingType,    setDecidingType]    = useState<string | null>(null)
  const [decisionSuccess, setDecisionSuccess] = useState<string | null>(null)
  const [decisionError,   setDecisionError]   = useState<string | null>(null)

  // Conditional admission panel state
  const [condMessage,      setCondMessage]      = useState('')

  // Document download state
  const [downloading, setDownloading] = useState<string | null>(null)

  // ── Mock Fetch ──────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 600))
    
    setApplicant(MOCK_APPLICANT)
    setApplication({ ...MOCK_APPLICATION, applicant_id: applicantId })
    setDocuments(MOCK_DOCUMENTS)
    setCondMessage(MOCK_APPLICATION.conditional_message ?? '')
    setLoading(false)
  }, [applicantId])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Mock Status update ────────────────────────────────────────────────────

  const handleStatusUpdate = async () => {
    if (!application || !selectedStatus || selectedStatus === application.application_status) return

    if (selectedStatus === 'Admission sous réserve' && !condMessage.trim()) {
      setUpdateError("Un message pour le candidat est obligatoire pour l'admission sous réserve. Saisissez-le ci-dessous.")
      return
    }

    setIsUpdating(true)
    setUpdateError(null)
    setUpdateSuccess(false)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Update local state
    setApplication(prev => prev ? { ...prev, application_status: selectedStatus, version: prev.version + 1 } : null)
    setUpdateSuccess(true)
    setSelectedStatus('')
    setIsUpdating(false)
    setTimeout(() => setUpdateSuccess(false), 3000)
  }

  // ── Mock Decision action ──────────────────────────────────────────────────

  const handleDecision = async (decisionType: 'conditional' | 'final' | 'rejected') => {
    if (!application) return
    setDecidingType(decisionType)
    setDecisionError(null)
    setDecisionSuccess(null)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1200))

    const statusMap = {
      conditional: 'Admission sous réserve',
      final: 'Admission définitive',
      rejected: 'Dossier refusé',
    }

    // Update local state
    setApplication(prev => prev ? { ...prev, application_status: statusMap[decisionType], version: prev.version + 1 } : null)

    const labels: Record<string, string> = {
      conditional: "Admission sous réserve accordée. L'email de notification serait envoyé.",
      final:       "Admission définitive accordée. L'email de félicitations serait envoyé.",
      rejected:    "Dossier refusé. L'email de notification serait envoyé au candidat.",
    }
    setDecisionSuccess(labels[decisionType])
    setDecidingType(null)
    setTimeout(() => setDecisionSuccess(null), 5000)
  }

  // ── Mock Document download ──────────────────────────────────────────────────

  const handleDownload = async (doc: UploadedDoc) => {
    setDownloading(doc.id)
    
    // Simulate download delay
    await new Promise(resolve => setTimeout(resolve, 800))
    
    alert(`Mode test: Le fichier "${doc.file_name}" serait téléchargé.`)
    setDownloading(null)
  }

  // ── Sign out ───────────────────────────────────────────────────────────────

  const handleSignOut = () => {
    router.push('/admin/login')
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#021463] mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Chargement du dossier���</p>
        </div>
      </div>
    )
  }

  if (!application || !applicant) return null

  const statusStyle = APP_STATUS_STYLE[application.application_status] ?? APP_STATUS_STYLE['Dossier Créé']
  const StatusIcon  = statusStyle.icon
  const isDirty     = selectedStatus !== '' && selectedStatus !== application.application_status

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── Navbar ── */}
      <header className="bg-[#021463] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-2xl font-bold text-white tracking-tight">Admitta</span>
            <span className="hidden sm:inline text-white/30 text-lg font-thin">|</span>
            <span className="hidden sm:inline text-white/70 text-sm font-medium">Bureau des Admissions</span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-white/65 hover:text-white text-sm font-medium transition-colors hover:bg-white/10 px-3 py-1.5 rounded-md"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Se déconnecter</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-10 space-y-6">

        {/* ── Back link + ID ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-[#4EA6F5] hover:text-[#021463] font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Retour à la liste
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Identifiant</span>
            <span className="font-mono text-sm font-bold text-[#021463] bg-slate-100 px-2 py-0.5 rounded">{application.applicant_id}</span>
          </div>
        </div>

        {/* ── Header card ── */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#021463]">
              {applicant.prenom} {applicant.nom}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Rentrée {application.intake_year}</p>
          </div>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${statusStyle.bg} ${statusStyle.text}`}>
            <StatusIcon className="w-4 h-4" />
            <span className="text-sm font-semibold">{APP_STATUS_LABELS[application.application_status]}</span>
          </div>
        </div>

        {/* ── Scholarship badge ── */}
        {application.is_scholarship_eligible && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <BadgeCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">Candidat à la Bourse d&apos;Excellence</p>
              <p className="text-xs text-amber-600">Ce candidat a postulé pour la bourse d&apos;études.</p>
            </div>
          </div>
        )}

        {/* ── 2-col grid ── */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Personal info */}
          <SectionCard icon={User} title="Informations Personnelles">
            <InfoRow label="Prénom" value={applicant.prenom} />
            <InfoRow label="Nom" value={applicant.nom} />
            <InfoRow label="Email" value={applicant.email} />
            <InfoRow label="Téléphone" value={applicant.phone_number} />
            <InfoRow label="Date de naissance" value={applicant.date_naissance ? new Date(applicant.date_naissance).toLocaleDateString('fr-FR') : null} />
          </SectionCard>

          {/* Academic info */}
          <SectionCard icon={GraduationCap} title="Informations Académiques">
            <InfoRow label="École" value={application.ecole_provenance} />
            <InfoRow label="Option" value={application.option_academique} />
            <InfoRow label="Année diplôme" value={application.graduation_year?.toString()} />
            <InfoRow label="Examen d'État" value={application.exam_status} />
            <InfoRow label="Pourcentage Exetat" value={application.exetat_percentage ? `${application.exetat_percentage}%` : null} />
          </SectionCard>

          {/* Grades */}
          <SectionCard icon={FileText} title="Moyennes Scolaires">
            <InfoRow label="10e année" value={application.grade_10_average ? `${application.grade_10_average}%` : null} />
            <InfoRow label="11e année" value={application.grade_11_average ? `${application.grade_11_average}%` : null} />
            <InfoRow label="12e année" value={application.grade_12_average ? `${application.grade_12_average}%` : null} />
          </SectionCard>

          {/* Payment info */}
          <SectionCard icon={CreditCard} title="Paiement">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Statut</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${PAY_STYLE[application.payment_status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {PAY_LABELS[application.payment_status] ?? application.payment_status}
                </span>
              </div>
              <InfoRow label="Transaction ID" value={application.transaction_id} />
              <InfoRow label="Confirmé le" value={application.payment_confirmed_at ? new Date(application.payment_confirmed_at).toLocaleString('fr-FR') : null} />
            </div>
          </SectionCard>
        </div>

        {/* ── Documents ── */}
        <SectionCard icon={FileText} title="Documents Soumis">
          <div className="space-y-6">
            {DOC_GROUPS.map(group => {
              const groupDocs = documents.filter(d => group.types.includes(d.document_type ?? ''))
              if (groupDocs.length === 0) return null
              return (
                <div key={group.key}>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">{group.title}</h4>
                  <div className="space-y-2">
                    {groupDocs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{doc.file_name}</p>
                            <p className="text-xs text-slate-400">
                              {(doc.file_size_bytes / 1024).toFixed(0)} Ko • {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownload(doc)}
                          disabled={downloading === doc.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#4EA6F5] hover:text-[#021463] hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                        >
                          {downloading === doc.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          Télécharger
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>

        {/* ── Decision Actions ── */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
            <Gavel className="w-4 h-4 text-[#4EA6F5]" />
            <h3 className="font-serif text-sm font-bold text-[#021463]">Actions de Décision</h3>
          </div>
          <div className="p-6 space-y-4">

            {/* Success/Error messages */}
            {decisionSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {decisionSuccess}
              </div>
            )}
            {decisionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {decisionError}
              </div>
            )}

            {/* Decision buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleDecision('conditional')}
                disabled={decidingType !== null || application.application_status === 'Admission sous réserve'}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {decidingType === 'conditional' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Admission sous réserve
              </button>
              <button
                onClick={() => handleDecision('final')}
                disabled={decidingType !== null || application.application_status === 'Admission définitive'}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {decidingType === 'final' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                Admission définitive
              </button>
              <button
                onClick={() => handleDecision('rejected')}
                disabled={decidingType !== null || application.application_status === 'Dossier refusé'}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {decidingType === 'rejected' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldX className="w-4 h-4" />}
                Refuser le dossier
              </button>
            </div>

            {/* Conditional message input */}
            {(selectedStatus === 'Admission sous réserve' || application.application_status === 'Admission sous réserve') && (
              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <label className="block text-sm font-semibold text-purple-800 mb-2">
                  Message pour le candidat (documents manquants, conditions, etc.)
                </label>
                <textarea
                  value={condMessage}
                  onChange={(e) => setCondMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Ex: Veuillez soumettre votre diplôme d'État une fois obtenu..."
                />
              </div>
            )}

            {/* Manual status update (fallback) */}
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-2">Ou modifier manuellement le statut:</p>
              <div className="flex items-center gap-3">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4EA6F5]/40"
                >
                  <option value="">Sélectionner un statut…</option>
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleStatusUpdate}
                  disabled={!isDirty || isUpdating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#021463] hover:bg-[#021463]/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Appliquer
                </button>
              </div>
              {updateSuccess && (
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Statut mis à jour avec succès.
                </p>
              )}
              {updateError && (
                <p className="text-xs text-red-600 mt-2">{updateError}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Metadata ── */}
        <div className="text-xs text-slate-400 flex flex-wrap gap-4">
          <span>Créé le {new Date(application.created_at).toLocaleString('fr-FR')}</span>
          <span>Mis à jour le {new Date(application.updated_at).toLocaleString('fr-FR')}</span>
          <span>Version {application.version}</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center">
        <p className="text-xs text-slate-300">© 2026 Ignito Academy. Tous droits réservés.</p>
      </footer>
    </div>
  )
}
