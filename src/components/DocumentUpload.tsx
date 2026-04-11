'use client'

import { useState, useRef } from 'react'
import { CheckCircle2, Upload, Loader2, Trash2, FileText, AlertCircle, Lock } from 'lucide-react'

type DocumentType = 'identification' | 'diploma' | 'bulletin_10' | 'bulletin_11' | 'bulletin_12' | 'document_conditionnel'

interface UploadedDocument {
  id: string
  file_name: string
  file_size_bytes: number
  mime_type: string
  uploaded_at: string
  file_path: string
  document_type: DocumentType | string | null
}

interface DocumentUploadProps {
  paymentStatus: string
  applicantId: string
  uploadedDocuments?: UploadedDocument[]
  onUploadSuccess?: () => void
  applicationStatus?: string
  examStatus?: string
}

const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_FILE_SIZE = 5242880 // 5MB

const BULLETIN_ROWS: { type: DocumentType; label: string }[] = [
  { type: 'bulletin_10', label: 'Bulletin de la 10e année' },
  { type: 'bulletin_11', label: 'Bulletin de la 11e année' },
  { type: 'bulletin_12', label: 'Bulletin de la 12e année' },
]

// ─── Slot ─────────────────────────────────────────────────────────────────────

interface SlotProps {
  type: DocumentType
  title: string
  description: string
  existingDoc: UploadedDocument | undefined
  applicantId: string
  onSuccess: () => void
  compact?: boolean
  locked?: boolean
}

function DocumentSlot({
  type, title, description, existingDoc, applicantId, onSuccess,
  compact = false, locked = false,
}: SlotProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Mock file upload handler - simulates network call
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (file.size > MAX_FILE_SIZE) { setError('Fichier trop volumineux (max 5 Mo).'); return }
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) { setError('Format non accepté. Utilisez PDF, JPG ou PNG.'); return }

    setIsUploading(true)
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock success - call the success callback
      onSuccess()
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  // Mock delete handler - simulates network call
  const handleDelete = async () => {
    if (!existingDoc) return
    setIsDeleting(true)
    setError(null)
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Mock success
      onSuccess()
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Locked + uploaded ──
  if (locked && existingDoc) {
    return (
      <div className="flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          {!compact && <p className="text-sm font-semibold text-[#021463]">{title}</p>}
          <p className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-[260px]">{existingDoc.file_name}</p>
          <p className="text-xs text-slate-400">
            {(existingDoc.file_size_bytes / 1048576).toFixed(2)} Mo &middot;{' '}
            {new Date(existingDoc.uploaded_at).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </p>
        </div>
      </div>
    )
  }

  // ── Locked + missing ──
  if (locked && !existingDoc) {
    return (
      <div className="flex items-center gap-2.5 opacity-50">
        <div className="w-4 h-4 mt-0.5 rounded-full border-2 border-slate-300 flex-shrink-0" />
        <div>
          {!compact && <p className="text-sm font-semibold text-slate-500">{title}</p>}
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
      </div>
    )
  }

  // ── Normal uploaded ──
  if (existingDoc) {
    return (
      <div>
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              {!compact && <p className="text-sm font-semibold text-[#021463]">{title}</p>}
              <p className="text-xs text-slate-500 truncate max-w-[180px] sm:max-w-[220px]">{existingDoc.file_name}</p>
              <p className="text-xs text-slate-400">
                {(existingDoc.file_size_bytes / 1048576).toFixed(2)} Mo &middot;{' '}
                {new Date(existingDoc.uploaded_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-6 sm:ml-0">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={isUploading || isDeleting}
              className="text-xs text-[#4EA6F5] border border-[#4EA6F5] rounded px-3 py-2 min-h-[44px] hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              Remplacer
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting || isUploading}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
              aria-label="Supprimer"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  // ── Normal empty ──
  return (
    <div>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-4 h-4 mt-0.5 rounded-full border-2 border-slate-300 flex-shrink-0" />
          <div>
            {!compact && <p className="text-sm font-semibold text-slate-700">{title}</p>}
            {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
          </div>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center justify-center gap-1.5 flex-shrink-0 text-xs font-medium text-[#4EA6F5] border border-[#4EA6F5] rounded px-4 py-2 min-h-[48px] hover:bg-blue-50 transition-colors disabled:opacity-50 w-full sm:w-auto mt-3 sm:mt-0"
        >
          {isUploading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi…</>
            : <><Upload className="w-4 h-4" />Télécharger</>}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Conditional document row (read-only display + delete) ────────────────────

interface CondDocRowProps {
  doc: UploadedDocument
  onSuccess: () => void
  locked: boolean
}

function ConditionalDocRow({ doc, onSuccess, locked }: CondDocRowProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mock delete handler
  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800))
      
      onSuccess()
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-slate-700 font-medium truncate max-w-[200px] sm:max-w-[260px]">{doc.file_name}</p>
            <p className="text-xs text-slate-400">
              {(doc.file_size_bytes / 1048576).toFixed(2)} Mo &middot;{' '}
              {new Date(doc.uploaded_at).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </p>
          </div>
        </div>
        {!locked && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 flex-shrink-0 ml-6 sm:ml-0"
            aria-label="Supprimer"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DocumentUpload({ paymentStatus, applicantId, uploadedDocuments = [], onUploadSuccess, applicationStatus, examStatus }: DocumentUploadProps) {
  // Lock once payment is confirmed — but unlock again if admin set status to Admission sous réserve
  const isConditional = applicationStatus === 'Admission sous réserve'
  const locked = (paymentStatus === 'paid' || paymentStatus === 'Confirmed') && !isConditional
  const byType = (type: DocumentType) => uploadedDocuments.find(d => d.document_type === type)

  // Diploma is optional when applicant is still awaiting exam results
  const diplomaOptional = examStatus === 'En attente des résultats'

  // All documents submitted during conditional-admission rounds
  const conditionalDocs = uploadedDocuments.filter(d => d.document_type === 'document_conditionnel')

  const slotProps = (type: DocumentType) => ({
    type,
    existingDoc: byType(type),
    applicantId,
    onSuccess: onUploadSuccess ?? (() => {}),
    locked,
  })

  return (
    <div className="space-y-4">

      {/* Locked banner — only shown when locked by payment (not when conditionally unlocked) */}
      {locked && !isConditional && (
        <div className="flex items-start gap-2.5 px-3 py-3 sm:px-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-800 font-medium leading-relaxed">
            Documents verrouillés — Votre paiement a été confirmé. Les fichiers ne peuvent plus être modifiés.
          </p>
        </div>
      )}

      {/* Card 1 – Identity */}
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 ${locked ? 'opacity-80' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-[#4EA6F5]" />
          <h4 className="text-sm font-bold text-[#021463]">Preuve d&apos;Identité</h4>
        </div>
        <p className="text-xs text-slate-400 mb-4">Carte d&apos;électeur, passeport, attestation ou acte de naissance.</p>
        <DocumentSlot {...slotProps('identification')} title="Preuve d'Identité" description="" compact />
      </div>

      {/* Card 2 – Diploma (conditionally optional) */}
      <div className={`bg-white rounded-xl shadow-sm border p-4 sm:p-5 ${locked ? 'opacity-80' : ''} ${diplomaOptional ? 'border-slate-200' : 'border-slate-200'}`}>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-[#4EA6F5]" />
          <h4 className="text-sm font-bold text-[#021463]">Diplôme d&apos;État ou Attestation</h4>
          {diplomaOptional ? (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              Optionnel pour le moment
            </span>
          ) : (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
              Requis *
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          {diplomaOptional
            ? "Puisque vous êtes en attente de vos résultats, vous pouvez soumettre votre dossier sans ce document. Il vous sera demandé ultérieurement pour votre admission définitive."
            : "Copie officielle de votre diplôme ou attestation de réussite."}
        </p>
        <DocumentSlot {...slotProps('diploma')} title="Diplôme d'État ou Attestation" description="" compact />
      </div>

      {/* Card 3 – Bulletins */}
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 ${locked ? 'opacity-80' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-[#4EA6F5]" />
          <h4 className="text-sm font-bold text-[#021463]">Historique Scolaire (Bulletins)</h4>
        </div>
        <p className="text-xs text-slate-400 mb-4">Vos bulletins de notes pour les 3 dernières années du secondaire.</p>
        <div className="divide-y divide-slate-100">
          {BULLETIN_ROWS.map(({ type, label }, i) => (
            <div key={type} className={`${i === 0 ? '' : 'pt-3'} ${i < BULLETIN_ROWS.length - 1 ? 'pb-3' : ''}`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-1.5">
                <span className="text-xs font-medium text-slate-600">{label}</span>
                {byType(type) && !locked && (
                  <p className="text-xs text-emerald-600 truncate flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate max-w-[150px] sm:max-w-none">{byType(type)!.file_name}</span>
                  </p>
                )}
              </div>
              <DocumentSlot {...slotProps(type)} title={label} description="" compact />
            </div>
          ))}
        </div>
      </div>

      {/* Card 4 – Additional / conditional documents */}
      {(conditionalDocs.length > 0 || isConditional) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-bold text-[#021463]">Documents Additionnels</h4>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Documents soumis suite à une demande de compléments de dossier.
          </p>

          {conditionalDocs.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Aucun document additionnel soumis pour l&apos;instant.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {conditionalDocs.map((doc, i) => (
                <div key={doc.id} className={`${i === 0 ? '' : 'pt-3'} ${i < conditionalDocs.length - 1 ? 'pb-3' : ''}`}>
                  <ConditionalDocRow
                    doc={doc}
                    onSuccess={onUploadSuccess ?? (() => {})}
                    locked={locked}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {!locked && (
        <div className="flex items-start gap-2 px-1">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-400 leading-relaxed">
            Formats acceptés : PDF, JPG, PNG · Taille max : 5 Mo par fichier.
            Le paiement sera débloqué une fois tous les documents reçus.
          </p>
        </div>
      )}
    </div>
  )
}
