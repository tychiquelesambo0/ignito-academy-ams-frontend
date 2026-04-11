'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ApplicationStatusTracker } from '@/components/ApplicationStatusTracker'
import { DocumentUpload } from '@/components/DocumentUpload'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { AlertTriangle, Loader2, Paperclip, CheckCircle2, X, Star, Play } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'

// ─── MOCK DATA ───────────────────────────────────────────────────────────────
// This is hardcoded mock data for frontend development.
// A backend engineer will wire this up to a real API later.

// TODO: Backend engineer - Replace with actual user data from Supabase auth
const MOCK_APPLICANT = {
  prenom: 'Jean',
  nom: 'Kabila',
  email: 'jean.kabila@example.com',
  date_naissance: '2005-03-15',
}

// TODO: Backend engineer - Replace with actual application data from database
const MOCK_APPLICATIONS = [
  {
    id: '1',
    applicant_id: 'APP-2026-001234',
    user_id: 'user-123',
    intake_year: 2026,
    created_at: '2026-01-15T10:30:00Z',
    application_status: 'en_cours_devaluation', // Options: 'en_attente', 'en_cours_devaluation', 'Admission définitive', 'Admission sous réserve', 'Dossier refusé'
    payment_status: 'paid', // Options: 'pending', 'paid', 'waived', 'Confirmed'
    ecole_provenance: 'Lycee Prince de Liege',
    option_academique: 'Math-Physique',
    exam_status: 'En attente de l\'Examen d\'Etat',
    is_scholarship_eligible: true,
    scholarship_status: null, // Options: null, 'submitted'
    scholarship_video_url: null,
    conditional_message: null,
    uploadedDocuments: [
      { id: '1', file_name: 'carte_identite.pdf', file_size_bytes: 524288, mime_type: 'application/pdf', uploaded_at: '2026-01-16T09:00:00Z', file_path: '/docs/id.pdf', document_type: 'identification' },
      { id: '2', file_name: 'bulletin_10eme.pdf', file_size_bytes: 1048576, mime_type: 'application/pdf', uploaded_at: '2026-01-16T09:05:00Z', file_path: '/docs/b10.pdf', document_type: 'bulletin_10' },
      { id: '3', file_name: 'bulletin_11eme.pdf', file_size_bytes: 1048576, mime_type: 'application/pdf', uploaded_at: '2026-01-16T09:10:00Z', file_path: '/docs/b11.pdf', document_type: 'bulletin_11' },
    ],
  },
]

type DecisionStatus = 'Admission définitive' | 'Admission sous réserve' | 'Dossier refusé'
const DECISION_STATUSES: DecisionStatus[] = [
  'Admission définitive',
  'Admission sous réserve',
  'Dossier refusé',
]

export default function DashboardPage() {
  const router = useRouter()
  
  // ─── Local state ───────────────────────────────────────────────────────────
  const [applicant, setApplicant] = useState<typeof MOCK_APPLICANT | null>(null)
  const [applicationsWithDocs, setApplicationsWithDocs] = useState<typeof MOCK_APPLICATIONS>([])
  const [loading, setLoading] = useState(true)
  
  const [resubmitting, setResubmitting] = useState<string | null>(null)
  const [resubmitToast, setResubmitToast] = useState<string | null>(null)
  
  // Scholarship video modal state
  const [scholarshipModal, setScholarshipModal] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoError, setVideoError] = useState<string | null>(null)
  const [videoSaving, setVideoSaving] = useState(false)
  
  // Conditional upload state
  const [condFile, setCondFile] = useState<File | null>(null)
  const [condUploading, setCondUploading] = useState(false)
  const [condUploadError, setCondUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Fetch real data on mount ──────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/apply')
          return
        }

        // Get applicant profile
        const { data: applicantData } = await supabase
          .from('applicants')
          .select('*')
          .eq('id', user.id)
          .single()

        if (!applicantData) {
          router.push('/apply')
          return
        }

        setApplicant({
          prenom: applicantData.prenom,
          nom: applicantData.nom,
          email: applicantData.email,
          date_naissance: applicantData.date_naissance,
        })

        // Check if user has an application
        const { data: applications } = await supabase
          .from('applications')
          .select('*')
          .eq('user_id', user.id)

        if (!applications || applications.length === 0) {
          // No application exists - show empty state
          console.log('No application found, showing empty state')
          setApplicationsWithDocs([])
          setLoading(false)
          return
        }

        // User has application(s) - show dashboard with mock data for now
        // TODO: Load real application data
        setApplicationsWithDocs(MOCK_APPLICATIONS)
        setLoading(false)

      } catch (error) {
        console.error('Error fetching data:', error)
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  // ─── Mock handlers (simulate backend calls) ────────────────────────────────
  
  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/apply')
  }

  const handleNewApplication = () => {
    router.push('/dashboard/new-application')
  }

  const handleConditionalUploadAndSubmit = async (applicantId: string) => {
    if (!condFile) return
    setCondUploading(true)
    setCondUploadError(null)

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Mock success
    setCondFile(null)
    setResubmitToast('Documents soumis avec succès. Votre dossier est de nouveau en cours d\'évaluation.')
    
    // Update mock state
    setApplicationsWithDocs(prev => prev.map(app => 
      app.applicant_id === applicantId 
        ? { ...app, application_status: 'en_cours_devaluation' }
        : app
    ))
    
    setCondUploading(false)
    setTimeout(() => setResubmitToast(null), 5000)
  }

  const handleResubmit = async (applicantId: string) => {
    setResubmitting(applicantId)
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setResubmitToast('Documents soumis avec succès. Votre dossier est de nouveau en cours d\'évaluation.')
    setResubmitting(null)
    setTimeout(() => setResubmitToast(null), 5000)
  }

  const handleVideoSubmit = async () => {
    setVideoError(null)
    const trimmed = videoUrl.trim()
    if (!trimmed) { setVideoError('Veuillez saisir une URL.'); return }

    const isYouTube = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(trimmed)
    const isDrive = /^https?:\/\/(drive|docs)\.google\.com\//.test(trimmed)
    if (!isYouTube && !isDrive) {
      setVideoError('URL invalide. Utilisez un lien YouTube (youtube.com / youtu.be) ou Google Drive (drive.google.com).')
      return
    }

    setVideoSaving(true)
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Update mock state
    setApplicationsWithDocs(prev => prev.map(app => ({
      ...app,
      scholarship_video_url: trimmed,
      scholarship_status: 'submitted',
    })))

    setScholarshipModal(false)
    setVideoUrl('')
    setVideoSaving(false)
  }

  // Mock document upload refresh
  const refreshData = () => {
    // In real app, this would refetch from backend
  }

  // Check re-apply eligibility
  const currentYear = new Date().getFullYear()
  const hasCompletedPreviousApplication = applicationsWithDocs?.some(
    app => app.intake_year < currentYear && 
    (app.application_status === 'Admission définitive' || 
     app.application_status === 'Dossier refusé' ||
     app.application_status === 'Admission sous réserve')
  )
  const hasCurrentYearApplication = applicationsWithDocs?.some(
    app => app.intake_year === currentYear
  )
  const canReapply = hasCompletedPreviousApplication && !hasCurrentYearApplication

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#021463] mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Chargement de votre espace…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── Admitta Navbar ── */}
      <header className="bg-[#021463] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-serif text-xl md:text-2xl font-bold text-white tracking-tight">Admitta</span>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="text-white/65 hover:text-white hover:bg-white/10 text-sm font-medium min-h-[48px] px-4"
          >
            Se déconnecter
          </Button>
        </div>
      </header>

      {/* ── Toast ── */}
      {resubmitToast && (
        <div className={`fixed bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-md z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-center transition-all
          ${resubmitToast.includes('succès') ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {resubmitToast}
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6 md:py-10 space-y-6">

        {/* ── Greeting + ID row ── */}
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#021463] mb-1">
            Bienvenue, {applicant?.prenom} {applicant?.nom}
          </h1>
          <p className="text-slate-500 text-sm">
            Suivez l&apos;état de votre candidature et gérez vos documents justificatifs.
          </p>
        </div>

        {canReapply && (
          <Button 
            onClick={handleNewApplication}
            className="bg-[#4EA6F5] hover:bg-[#4EA6F5]/90 text-white min-h-[48px] px-6 font-semibold rounded-md w-full sm:w-auto"
          >
            Nouvelle candidature
          </Button>
        )}

        {/* ── Applications ── */}
        <div className="space-y-6">
          {applicationsWithDocs && applicationsWithDocs.length > 0 ? (
            applicationsWithDocs.map((application) => {
              const diplomaRequired = application.exam_status === 'Diplôme obtenu'
              const REQUIRED_DOC_TYPES = [
                'identification',
                'bulletin_10',
                'bulletin_11',
                'bulletin_12',
                ...(diplomaRequired ? ['diploma'] : []),
              ]
              return (
              <div key={application.id} className="space-y-4">

                {/* Meta row */}
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Dossier créé le {new Date(application.created_at).toLocaleDateString('fr-FR', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </p>

                {/* Status tracker */}
                <ApplicationStatusTracker
                  applicationStatus={application.application_status}
                  paymentStatus={application.payment_status}
                  applicantId={application.applicant_id}
                />

                {/* ── Decision Letter Download ── */}
                {DECISION_STATUSES.includes(application.application_status as DecisionStatus) && applicant && (
                  <div className={`rounded-xl border p-4 flex flex-col gap-3
                    ${application.application_status === 'Admission définitive'
                      ? 'bg-[#021463]/5 border-[#021463]/15'
                      : application.application_status === 'Admission sous réserve'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-slate-50 border-slate-200'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                        ${application.application_status === 'Admission définitive'
                          ? 'bg-[#021463]/10'
                          : application.application_status === 'Admission sous réserve'
                          ? 'bg-amber-100'
                          : 'bg-slate-200'}`}
                      >
                        <svg className={`w-5 h-5
                          ${application.application_status === 'Admission définitive'
                            ? 'text-[#021463]'
                            : application.application_status === 'Admission sous réserve'
                            ? 'text-amber-700'
                            : 'text-slate-500'}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold mb-0.5
                          ${application.application_status === 'Admission définitive'
                            ? 'text-[#021463]'
                            : application.application_status === 'Admission sous réserve'
                            ? 'text-amber-900'
                            : 'text-slate-700'}`}>
                          Votre lettre de décision officielle est disponible
                        </p>
                        <p className={`text-xs leading-relaxed
                          ${application.application_status === 'Admission définitive'
                            ? 'text-[#021463]/65'
                            : application.application_status === 'Admission sous réserve'
                            ? 'text-amber-700'
                            : 'text-slate-500'}`}>
                          Document généré par le Bureau des Admissions
                        </p>
                      </div>
                    </div>

                    <Button className="w-full sm:w-auto min-h-[48px] bg-[#021463] hover:bg-[#021463]/90 text-white font-semibold rounded-md text-sm">
                      Télécharger la lettre (PDF)
                    </Button>
                  </div>
                )}

                {/* Academic info card */}
                {application.ecole_provenance && application.option_academique && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
                    <h4 className="font-serif text-base font-bold text-[#021463] mb-4">
                      Informations académiques
                    </h4>
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div className="space-y-0.5">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">École</p>
                        <p className="font-medium text-[#1E293B]">{application.ecole_provenance}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Option</p>
                        <p className="font-medium text-[#1E293B]">{application.option_academique}</p>
                      </div>
                      {application.exam_status && (
                        <div className="space-y-0.5">
                          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Examen d&apos;État</p>
                          <p className="font-medium text-[#1E293B]">{application.exam_status}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Submission success banner ── */}
                {(application.application_status === 'en_cours_devaluation' ||
                  application.payment_status === 'waived' ||
                  application.payment_status === 'paid' ||
                  application.payment_status === 'Confirmed') &&
                  application.application_status !== 'Admission sous réserve' &&
                  application.application_status !== 'Admission définitive' &&
                  application.application_status !== 'Dossier refusé' && (
                  <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-emerald-800">
                      Dossier soumis avec succès. Notre équipe d&apos;admission examine actuellement votre profil.
                    </p>
                  </div>
                )}

                {/* ── Upload prompt (docs still pending) ── */}
                {(() => {
                  const allDocsUploaded = REQUIRED_DOC_TYPES.every(t =>
                    application.uploadedDocuments?.some((d: { document_type: string }) => d.document_type === t)
                  )
                  if (allDocsUploaded) return null
                  if (application.application_status === 'Admission sous réserve') return null
                  return (
                    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-[#021463]/15 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-[#021463]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-[#021463]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#021463] mb-0.5">Action requise</p>
                        <p className="text-sm text-[#1E293B]/70 leading-relaxed">
                          Veuillez télécharger les documents requis ci-dessous pour compléter votre dossier.
                        </p>
                      </div>
                    </div>
                  )
                })()}

                {/* ── Scholarship VIP card ── */}
                {application.is_scholarship_eligible &&
                  application.application_status === 'en_cours_devaluation' && (
                  <div className="rounded-xl border border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-amber-200 flex items-center gap-3">
                      <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                      <p className="font-bold text-amber-900 text-sm">
                        Éligibilité à la Bourse d&apos;Excellence
                      </p>
                    </div>
                    <div className="px-4 py-4 space-y-3">
                      {application.scholarship_status === 'submitted' ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <p className="text-sm font-semibold text-emerald-800">Vidéo soumise — en cours d&apos;évaluation</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-amber-800 leading-relaxed">
                            Félicitations ! Votre profil académique répond aux critères de la Bourse d&apos;Excellence du Fondateur.
                            Soumettez un essai vidéo de 2 minutes pour finaliser votre candidature à la bourse.
                          </p>
                          <Button
                            onClick={() => { setScholarshipModal(true); setVideoError(null) }}
                            className="w-full sm:w-auto bg-[#021463] hover:bg-[#021463]/90 text-white min-h-[48px] px-5 text-sm font-semibold rounded-md flex items-center justify-center gap-2"
                          >
                            <Play className="w-4 h-4" />
                            Soumettre ma candidature à la Bourse
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Conditional admission: unified single card ── */}
                {application.application_status === 'Admission sous réserve' && (
                  <div className="border border-amber-400 rounded-xl overflow-hidden">

                    {/* Top: admin message */}
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border-b border-amber-200">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-amber-900 mb-1">
                          Action requise : Admission sous réserve
                        </p>
                        <p className="text-sm text-amber-800 leading-relaxed">
                          {application.conditional_message
                            ? application.conditional_message
                            : 'Votre dossier a été examiné. Veuillez soumettre les documents manquants pour finaliser votre admission.'}
                        </p>
                      </div>
                    </div>

                    {/* Bottom: upload zone */}
                    <div className="p-4 bg-amber-50/60 space-y-3">
                      <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                        Télécharger le document manquant · PDF, JPG ou PNG — max 5 Mo
                      </p>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0] ?? null
                          setCondFile(f)
                          setCondUploadError(null)
                          e.target.value = ''
                        }}
                      />

                      {!condFile ? (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full flex items-center justify-center gap-2 min-h-[48px] rounded-lg border-2 border-dashed border-amber-300 bg-white text-amber-700 text-sm font-medium hover:border-amber-400 hover:bg-amber-50 transition-colors"
                        >
                          <Paperclip className="w-4 h-4" />
                          Choisir le document requis
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-200">
                          <Paperclip className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span className="text-sm text-amber-900 font-medium flex-1 truncate">{condFile.name}</span>
                          <button
                            onClick={() => { setCondFile(null); setCondUploadError(null) }}
                            className="text-amber-400 hover:text-amber-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label="Retirer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {condUploadError && (
                        <p className="text-xs text-red-600 font-medium">{condUploadError}</p>
                      )}

                      {condFile && (
                        <Button
                          onClick={() => handleConditionalUploadAndSubmit(application.applicant_id)}
                          disabled={condUploading}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white min-h-[48px] text-sm font-semibold rounded-md transition-all"
                        >
                          {condUploading
                            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Envoi en cours…</>
                            : <><CheckCircle2 className="w-4 h-4 mr-2" />Soumettre les documents manquants</>}
                        </Button>
                      )}
                    </div>

                  </div>
                )}

                {/* Document upload */}
                <div>
                  <h4 className="font-serif text-base font-bold text-[#021463] mb-3">Documents justificatifs</h4>
                  <DocumentUpload
                    paymentStatus={application.payment_status}
                    applicantId={application.applicant_id}
                    uploadedDocuments={application.uploadedDocuments}
                    onUploadSuccess={refreshData}
                    applicationStatus={application.application_status}
                    examStatus={application.exam_status}
                  />
                </div>

              </div>
            )})
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 md:p-12 text-center">
              <p className="text-slate-400 mb-5 text-sm">Vous n&apos;avez pas encore de candidature en cours.</p>
              <p className="text-slate-600 mb-6 text-sm">
                Pour soumettre votre candidature au programme UK Level 3 Foundation Diploma, veuillez remplir le formulaire de candidature.
              </p>
              <Button 
                onClick={() => alert('Le formulaire de candidature sera disponible prochainement. Pour l\'instant, cette fonctionnalité est en développement.')}
                className="w-full sm:w-auto bg-[#021463] hover:bg-[#021463]/90 text-white min-h-[48px] px-8 font-semibold rounded-md"
              >
                Commencer une candidature
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-300 pt-4">© 2026 Ignito Academy. Tous droits réservés.</p>
      </main>

      {/* ── Scholarship Video Modal ── */}
      <Dialog open={scholarshipModal} onOpenChange={setScholarshipModal}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#021463] text-xl">
              Soumettre mon essai vidéo
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm leading-relaxed">
              Collez ci-dessous le lien de votre essai vidéo (YouTube non-listé ou Google Drive).
              La vidéo doit durer entre 1 et 3 minutes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1E293B]">
                URL de la vidéo <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={e => { setVideoUrl(e.target.value); setVideoError(null) }}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full min-h-[48px] px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#021463] focus:border-[#021463] transition-colors"
              />
              {videoError && <p className="text-xs text-red-500">{videoError}</p>}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Button
                variant="outline"
                onClick={() => { setScholarshipModal(false); setVideoUrl(''); setVideoError(null) }}
                className="flex-1 min-h-[48px] rounded-md text-sm order-2 sm:order-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleVideoSubmit}
                disabled={videoSaving}
                className="flex-1 min-h-[48px] bg-[#021463] hover:bg-[#021463]/90 text-white font-semibold rounded-md text-sm order-1 sm:order-2"
              >
                {videoSaving
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Envoi…</>
                  : 'Soumettre'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
