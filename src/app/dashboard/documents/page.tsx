'use client'

/**
 * Documents — /dashboard/documents
 *
 * Allows the applicant to upload, replace, and delete their required documents.
 * All uploads go to /api/documents/upload → Supabase Storage (pieces_justificatives).
 *
 * Gate: unlocked only after academic history is saved (useApplicationSteps).
 * Submit: sets applications.documents_submitted = true → unlocks Payment step.
 * Lock: documents become read-only once payment_status is Confirmed or Waived,
 *       unless « Admission sous réserve » or conditional_message (demande complémentaire).
 * Après dépôt des pièces demandées : bouton « Confirmer l'envoi… » appelle
 * /api/documents/confirm-supplementary-submission (efface conditional_message).
 *
 * Accepted formats: PDF, JPG, PNG — max 5 MB per file (enforced client + server + DB).
 * NO video uploads (architecture pillar).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useApplication } from '@/lib/context/ApplicationContext'
import { useApplicationSteps } from '@/lib/hooks/useApplicationSteps'
import {
  isDocumentLocked,
  type ApplicationStatus,
  type PaymentStatus,
} from '@/lib/status-machine'
import StepGate from '@/components/dashboard/StepGate'
import BackButton from '@/components/dashboard/BackButton'
import {
  FileText,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ImageIcon,
  Lock,
  Info,
  File,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedDoc {
  id: string
  documentType: string
  fileName: string
  fileSizeBytes: number
  mimeType: string
  uploadedAt: string
}

// ─── Document catalogue ───────────────────────────────────────────────────────
// Values MUST match the DB CHECK constraint on uploaded_documents.document_type.

const REQUIRED_DOCS = [
  {
    type: 'Bulletin 10ème',
    label: 'Bulletin de 10ème année',
    description: 'Relevé de notes officiel de la 10ème année scolaire',
    icon: FileText,
  },
  {
    type: 'Bulletin 11ème',
    label: 'Bulletin de 11ème année',
    description: 'Relevé de notes officiel de la 11ème année scolaire',
    icon: FileText,
  },
  {
    type: 'Bulletin 12ème',
    label: 'Bulletin de 12ème année',
    description: 'Relevé de notes officiel de la 12ème année scolaire',
    icon: FileText,
  },
  {
    type: "Carte d'identité",
    label: "Pièce d'identité nationale",
    description: 'Carte nationale d\'identité ou passeport en cours de validité',
    icon: FileText,
  },
] as const

const OPTIONAL_DOCS = [
  {
    type: "Diplôme d'État",
    label: "Diplôme d'État (EXETAT)",
    description: 'Candidats en attente de résultats : soumettez-le dès réception pour une admission définitive',
    icon: FileText,
  },
  {
    type: "Photo d'identité",
    label: "Photo d'identité",
    description: 'Photo format passeport, fond blanc, prise récente',
    icon: ImageIcon,
  },
  {
    type: 'Autre',
    label: 'Document supplémentaire',
    description: 'Tout autre document jugé pertinent pour votre dossier',
    icon: File,
  },
] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(b: number): string {
  if (b < 1024) return `${b} o`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`
  return `${(b / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── DocumentSlot ─────────────────────────────────────────────────────────────

function DocumentSlot({
  docDef,
  required,
  uploaded,
  applicantId,
  locked,
  onUploaded,
  onDeleted,
}: {
  docDef: { type: string; label: string; description: string; icon: React.ElementType }
  required: boolean
  uploaded: UploadedDoc | null
  applicantId: string
  locked: boolean
  onUploaded: (doc: UploadedDoc) => void
  onDeleted: (docType: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [slotError, setSlotError] = useState<string | null>(null)
  const Icon = docDef.icon

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (fileInputRef.current) fileInputRef.current.value = ''

    setSlotError(null)

    if (file.size > 5_242_880) {
      setSlotError('Fichier trop volumineux. Maximum autorisé : 5 Mo.')
      return
    }
    if (!['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setSlotError('Format non accepté. Utilisez PDF, JPG ou PNG.')
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('applicantId', applicantId)
      fd.append('documentType', docDef.type)

      const res  = await fetch('/api/documents/upload', { method: 'POST', body: fd })
      const body = await res.json()

      if (!res.ok) {
        setSlotError(body.error ?? 'Erreur lors du téléchargement.')
        return
      }

      onUploaded({
        id:             body.document.id,
        documentType:   docDef.type,
        fileName:       body.document.fileName,
        fileSizeBytes:  body.document.fileSizeBytes,
        mimeType:       body.document.mimeType,
        uploadedAt:     body.document.uploadedAt,
      })
    } catch {
      setSlotError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!uploaded) return
    setDeleting(true)
    setConfirmDelete(false)
    setSlotError(null)
    try {
      const res  = await fetch('/api/documents/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: uploaded.id }),
      })
      const body = await res.json()
      if (!res.ok) {
        setSlotError(body.error ?? 'Erreur lors de la suppression.')
        return
      }
      onDeleted(docDef.type)
    } catch {
      setSlotError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setDeleting(false)
    }
  }

  // ── Uploaded state ───────────────────────────────────────────────────────

  if (uploaded) {
    const isPdf = uploaded.mimeType === 'application/pdf'
    return (
      <div
        className={`rounded-lg border bg-white p-5 shadow-sm transition-opacity ${
          deleting ? 'opacity-40' : 'border-[#10B981]/30'
        }`}
      >
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#10B981]/10">
              <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{docDef.label}</p>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                required ? 'text-[#10B981]' : 'text-slate-400'
              }`}>
                {required ? 'Obligatoire · Soumis' : 'Optionnel · Soumis'}
              </span>
            </div>
          </div>
          <span className="shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isPdf ? 'PDF' : 'IMG'}
          </span>
        </div>

        {/* File info */}
        <div className="rounded-md bg-slate-50 px-3 py-2.5">
          <p className="truncate text-xs font-medium text-slate-700">{uploaded.fileName}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {formatBytes(uploaded.fileSizeBytes)} · Téléversé le {formatDate(uploaded.uploadedAt)}
          </p>
        </div>

        {/* Slot error */}
        {slotError && (
          <p className="mt-2 flex items-center gap-1 text-xs text-[#EF4444]">
            <AlertCircle className="h-3 w-3 shrink-0" /> {slotError}
          </p>
        )}

        {/* Actions — hidden when locked */}
        {!locked && (
          <div className="mt-3 flex items-center gap-2">
            {confirmDelete ? (
              <>
                <p className="flex-1 text-xs text-slate-500">Confirmer la suppression ?</p>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex h-8 items-center gap-1 rounded-md bg-[#EF4444]/10 px-3
                             text-xs font-semibold text-[#EF4444] transition-colors
                             hover:bg-[#EF4444]/20 disabled:opacity-50"
                >
                  {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Supprimer
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex h-8 items-center rounded-md border border-slate-200 px-3
                             text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  Annuler
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md
                             border border-slate-200 text-xs font-semibold text-slate-600
                             transition-colors hover:border-[#4EA6F5]/40 hover:text-[#4EA6F5]"
                >
                  <Upload className="h-3 w-3" />
                  Remplacer
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex h-8 items-center justify-center rounded-md
                             border border-[#EF4444]/20 px-3 text-xs font-semibold
                             text-[#EF4444]/60 transition-colors
                             hover:border-[#EF4444]/50 hover:text-[#EF4444]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
        />
      </div>
    )
  }

  // ── Empty / upload state ─────────────────────────────────────────────────

  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${
      locked ? 'opacity-50' : ''
    }`}>
      <div className="mb-4 flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100">
          <Icon className="h-4 w-4 text-slate-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{docDef.label}</p>
          <p className="text-xs text-slate-500">{docDef.description}</p>
          {required && (
            <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wider text-amber-500">
              Obligatoire
            </span>
          )}
        </div>
      </div>

      {slotError && (
        <p className="mb-2 flex items-start gap-1 text-xs text-[#EF4444]">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {slotError}
        </p>
      )}

      {locked ? (
        <div className="flex items-center justify-center gap-2 rounded-md border
                        border-dashed border-slate-200 py-5">
          <Lock className="h-3.5 w-3.5 text-slate-300" />
          <span className="text-xs text-slate-300">Verrouillé</span>
        </div>
      ) : uploading ? (
        <div className="flex items-center justify-center gap-2 rounded-md border
                        border-dashed border-[#4EA6F5]/40 bg-[#4EA6F5]/5 py-5">
          <Loader2 className="h-4 w-4 animate-spin text-[#4EA6F5]" />
          <span className="text-xs text-[#4EA6F5]">Téléchargement en cours…</span>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-md
                     border border-dashed border-slate-200 py-6 transition-colors
                     hover:border-[#4EA6F5]/50 hover:bg-[#4EA6F5]/5"
        >
          <Upload className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Cliquer pour téléverser</span>
          <span className="text-[10px] text-slate-400">PDF, JPG, PNG — Max 5 Mo</span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
      />
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

function DocumentsForm() {
  const { application, refetch } = useApplication()
  const steps       = useApplicationSteps()
  const paymentStep = steps.find((s) => s.id === 'payment')

  const [pageLoading,  setPageLoading]  = useState(true)
  const [slots,        setSlots]        = useState<Record<string, UploadedDoc | null>>({})
  const [submitting,   setSubmitting]   = useState(false)
  const [submitError,  setSubmitError]  = useState<string | null>(null)
  const [supplementarySubmitting, setSupplementarySubmitting] = useState(false)
  const [supplementaryError,      setSupplementaryError]      = useState<string | null>(null)
  const [supplementarySuccess,      setSupplementarySuccess]    = useState<string | null>(null)

  const applicantId      = application?.applicant_id ?? ''
  const alreadySubmitted = application?.documents_submitted === true
  const isLocked = application
    ? isDocumentLocked(
        application.application_status as ApplicationStatus,
        application.payment_status as PaymentStatus,
        application.conditional_message,
      )
    : true

  // Bannière complémentaire : uniquement lorsqu'un message admissions est actif
  // (après confirmation candidat, le message est effacé → disparaît de tout le tableau de bord).
  const supplementWindow =
    !!application &&
    !isLocked &&
    Boolean(application.conditional_message?.trim())

  const requiredTypes    = REQUIRED_DOCS.map((d) => d.type)
  const requiredUploaded = requiredTypes.filter((t) => slots[t] != null).length
  const allRequiredDone  = requiredUploaded === requiredTypes.length
  const canSubmit        = !isLocked && allRequiredDone

  // ── Load existing documents ───────────────────────────────────────────────

  const loadDocuments = useCallback(async () => {
    if (!applicantId) { setPageLoading(false); return }
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('uploaded_documents')
        .select('id, document_type, file_name, file_size_bytes, mime_type, uploaded_at')
        .eq('applicant_id', applicantId)
        .order('uploaded_at', { ascending: true })

      if (error) {
        console.error('[Documents] load error:', error)
      }

      // Initialise every known slot to null, then fill in what the DB returned
      const initial: Record<string, UploadedDoc | null> = {}
      for (const d of [...REQUIRED_DOCS, ...OPTIONAL_DOCS]) initial[d.type] = null

      for (const row of data ?? []) {
        initial[row.document_type] = {
          id:            row.id,
          documentType:  row.document_type,
          fileName:      row.file_name,
          fileSizeBytes: row.file_size_bytes,
          mimeType:      row.mime_type,
          uploadedAt:    row.uploaded_at,
        }
      }
      setSlots(initial)
    } catch (err) {
      console.error('[Documents] unexpected load error:', err)
    } finally {
      setPageLoading(false)
    }
  }, [applicantId])

  useEffect(() => { loadDocuments() }, [loadDocuments])

  // ── Slot callbacks ────────────────────────────────────────────────────────

  const handleUploaded = (doc: UploadedDoc) => {
    setSlots((prev) => ({ ...prev, [doc.documentType]: doc }))
  }

  const handleDeleted = (docType: string) => {
    setSlots((prev) => ({ ...prev, [docType]: null }))
  }

  // ── Submit documents ──────────────────────────────────────────────────────

  const handleConfirmSupplementary = async () => {
    if (!application?.conditional_message?.trim()) return
    setSupplementarySubmitting(true)
    setSupplementaryError(null)
    setSupplementarySuccess(null)
    try {
      const res  = await fetch('/api/documents/confirm-supplementary-submission', {
        method: 'POST',
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.success) {
        setSupplementaryError(
          typeof body.error === 'string' ? body.error : 'La confirmation n\'a pas abouti.',
        )
        return
      }
      await refetch()
      await loadDocuments()
      setSupplementarySuccess(
        'Confirmation enregistrée. Les avis sur votre tableau de bord sont levés ; le Bureau des admissions peut consulter vos fichiers.',
      )
    } catch {
      setSupplementaryError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setSupplementarySubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      const { data: saved, error } = await supabase
        .from('applications')
        .update({ documents_submitted: true })
        .eq('user_id', user.id)
        .select('user_id, documents_submitted')
        .single()

      if (error) throw new Error(error.message)
      if (!saved) throw new Error('La mise à jour n\'a pas abouti. Réessayez.')

      // Send confirmation email (fire-and-forget — don't block the UI)
      fetch('/api/documents/notify-submitted', { method: 'POST' }).catch((e) =>
        console.warn('[documents] notify-submitted error (non-fatal):', e),
      )

      await refetch()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur lors de la soumission.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#4EA6F5]" />
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <BackButton href="/dashboard/academic-history" label="Parcours Scolaire" />

      {/* Page header */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-[#4EA6F5]">
          <FileText className="h-5 w-5" />
          <span className="text-sm font-medium">Dossier de candidature</span>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-slate-800">Documents</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Téléversez vos pièces justificatives pour votre inscription au{' '}
          <span className="font-medium text-slate-700">UK Level 3 Foundation Diploma</span>.
          Formats acceptés&nbsp;:{' '}
          <span className="font-medium text-slate-600">PDF, JPG, PNG</span> —
          maximum&nbsp;<span className="font-medium text-slate-600">5 Mo</span> par fichier.
        </p>
      </div>

      {/* Demande de pièces complémentaires (admin) ou admission sous réserve */}
      {supplementWindow && (
        <div className="mb-6 rounded-lg border border-[#4EA6F5]/30 bg-[#EFF6FF] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#021463]">
            {application?.application_status === 'Admission sous réserve'
              ? 'Admission sous réserve'
              : 'Demande du service des admissions'}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-800">
            {application?.conditional_message?.trim()
              ? application.conditional_message
              : 'Des pièces complémentaires sont requises pour finaliser votre dossier. Veuillez les téléverser ci-dessous.'}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            Les téléversements sont déverrouillés. Utilisez les cases ci-dessous pour déposer les
            fichiers demandés. Si la pièce ne correspond à aucune catégorie obligatoire ou
            optionnelle, utilisez «&nbsp;Document supplémentaire&nbsp;».
          </p>
        </div>
      )}

      {/* Progress banner */}
      <div
        className={`mb-6 rounded-lg border p-4 ${
          allRequiredDone
            ? 'border-[#10B981]/25 bg-[#10B981]/5'
            : 'border-[#4EA6F5]/20 bg-[#4EA6F5]/5'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {allRequiredDone ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#10B981]" />
            ) : (
              <Info className="h-5 w-5 shrink-0 text-[#4EA6F5]" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {allRequiredDone
                  ? 'Tous les documents obligatoires sont soumis.'
                  : `${requiredUploaded} sur ${requiredTypes.length} documents obligatoires soumis`}
              </p>
              {alreadySubmitted && (
                <p className="mt-0.5 text-xs text-slate-500">
                  Dossier soumis — l'étape Paiement est débloquée.
                </p>
              )}
            </div>
          </div>

          {/* Step indicator dots */}
          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            {requiredTypes.map((t) => (
              <div
                key={t}
                className={`h-2 w-7 rounded-sm transition-colors duration-300 ${
                  slots[t] ? 'bg-[#10B981]' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Required documents */}
      <section className="mb-8">
        <h2 className="mb-1 font-serif text-lg font-semibold text-slate-800">
          Documents obligatoires
        </h2>
        <p className="mb-4 text-xs text-slate-400">
          Les quatre documents ci-dessous sont requis pour soumettre votre dossier.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {REQUIRED_DOCS.map((doc) => (
            <DocumentSlot
              key={doc.type}
              docDef={doc}
              required
              uploaded={slots[doc.type] ?? null}
              applicantId={applicantId}
              locked={isLocked}
              onUploaded={handleUploaded}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      </section>

      {/* Optional documents */}
      <section className="mb-8">
        <h2 className="mb-1 font-serif text-lg font-semibold text-slate-800">
          Documents optionnels
        </h2>
        <p className="mb-4 text-xs text-slate-400">
          Ces documents ne bloquent pas la soumission. Le Diplôme d'État peut être
          fourni ultérieurement — une admission sous réserve peut être accordée en son absence.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {OPTIONAL_DOCS.map((doc) => (
            <DocumentSlot
              key={doc.type}
              docDef={doc}
              required={false}
              uploaded={slots[doc.type] ?? null}
              applicantId={applicantId}
              locked={isLocked}
              onUploaded={handleUploaded}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      </section>

      {/* Submit / locked section */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        {isLocked ? (
          /* Payment confirmed — read-only */
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-slate-700">Documents verrouillés</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Vos documents ne peuvent plus être modifiés après confirmation du paiement, sauf si
                le service des admissions vous demande des pièces complémentaires.
              </p>
            </div>
          </div>
        ) : alreadySubmitted && supplementWindow ? (
          <div className="space-y-4 rounded-lg border border-[#4EA6F5]/25 bg-[#F8FAFC] p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#4EA6F5]" />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Dépôt de pièces complémentaires
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Votre dossier principal est déjà transmis. Téléversez les fichiers demandés dans
                  les sections ci-dessus ; ils sont enregistrés immédiatement et sont visibles par
                  le Bureau des admissions. Lorsque vous avez terminé, confirmez ci-dessous afin
                  de lever les avis sur votre tableau de bord.
                </p>
              </div>
            </div>
            {supplementaryError && (
              <div className="flex items-center gap-2 rounded-md border border-[#EF4444]/25 bg-[#EF4444]/5 px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-[#EF4444]" />
                <p className="text-xs text-[#EF4444]">{supplementaryError}</p>
              </div>
            )}
            {supplementarySuccess && (
              <div className="flex items-center gap-2 rounded-md border border-[#10B981]/25 bg-[#10B981]/5 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10B981]" />
                <p className="text-xs text-emerald-800">{supplementarySuccess}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleConfirmSupplementary}
              disabled={supplementarySubmitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md
                         bg-[#10B981] text-sm font-semibold text-white transition-colors
                         hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4EA6F5]"
            >
              {supplementarySubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmer l&apos;envoi des pièces complémentaires au Bureau des admissions
                </>
              )}
            </button>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Cette confirmation indique que vous avez terminé le dépôt demandé. Vous pourrez
              encore recevoir une nouvelle demande si le comité en a besoin.
            </p>
          </div>
        ) : alreadySubmitted ? (
          /* Already submitted — show next-step CTA */
          <div className="rounded-lg border border-[#4EA6F5]/20 bg-[#4EA6F5]/5 p-5
                          animate-in fade-in duration-300">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#10B981]" />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Documents soumis avec succès.
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Vous pouvez toujours ajouter ou remplacer des documents avant de payer.
                </p>
              </div>
            </div>
            {paymentStep?.unlocked && (
              <Link
                href="/dashboard/payment"
                className="mt-4 flex h-10 w-full items-center justify-center gap-2
                           rounded-md bg-[#021463] text-xs font-semibold text-white
                           transition-colors hover:bg-[#031a80]"
              >
                Étape suivante : Paiement
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        ) : (
          /* Not yet submitted */
          <>
            {!allRequiredDone && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200
                              bg-amber-50 px-4 py-3">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <p className="text-xs text-amber-700">
                  Téléversez les{' '}
                  <span className="font-semibold">
                    {requiredTypes.length - requiredUploaded} document
                    {requiredTypes.length - requiredUploaded > 1 ? 's' : ''} manquant
                    {requiredTypes.length - requiredUploaded > 1 ? 's' : ''}
                  </span>{' '}
                  pour activer la soumission.
                </p>
              </div>
            )}

            {submitError && (
              <div className="mb-4 flex items-center gap-2.5 rounded-lg border
                              border-[#EF4444]/30 bg-[#EF4444]/5 p-4">
                <AlertCircle className="h-4 w-4 shrink-0 text-[#EF4444]" />
                <p className="text-sm text-[#EF4444]">{submitError}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md
                         bg-[#021463] text-sm font-semibold text-white transition-colors
                         hover:bg-[#031a80] disabled:cursor-not-allowed disabled:opacity-40
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-[#4EA6F5]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Soumission en cours…
                </>
              ) : (
                'Soumettre mes documents'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  return (
    <StepGate stepId="documents">
      <DocumentsForm />
    </StepGate>
  )
}
