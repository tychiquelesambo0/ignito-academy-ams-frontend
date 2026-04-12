'use client'

/**
 * Dashboard Home Page
 * 
 * Main dashboard showing application status and quick actions
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  Loader2, 
  FileText, 
  CreditCard, 
  GraduationCap, 
  Award, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  User,
  ChevronRight,
  Upload,
  Video,
  Circle,
  CheckCircle
} from 'lucide-react'

interface Applicant {
  prenom: string
  nom: string
  email: string
}

interface Application {
  id: string
  applicant_id: string
  intake_year: number
  payment_status: string
  payment_amount_paid: number | null
  application_status: string
  ecole_provenance: string | null
  option_academique: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  
  const [applicant, setApplicant] = useState<Applicant | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)

  // Load applicant and application data
  useEffect(() => {
    async function loadData() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/apply')
          return
        }

        // Load applicant profile
        const { data: applicantData } = await supabase
          .from('applicants')
          .select('prenom, nom, email')
          .eq('id', user.id)
          .single()

        if (applicantData) {
          setApplicant(applicantData)
        }

        // Load application
        const { data: applicationData } = await supabase
          .from('applications')
          .select('id, applicant_id, intake_year, payment_status, payment_amount_paid, application_status, ecole_provenance, option_academique')
          .eq('user_id', user.id)
          .single()

        if (applicationData) {
          setApplication(applicationData)
        }

      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // No application - show empty state
  if (!application) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            Bienvenue, {applicant?.prenom} {applicant?.nom}
          </h1>
          <p className="text-muted-foreground mt-2">
            Suivez l'état de votre candidature et gérez vos documents justificatifs.
          </p>
        </div>

        <div className="bg-card border rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          
          <h2 className="text-xl font-semibold mb-2">Vous n'avez pas encore de candidature en cours</h2>
          <p className="text-muted-foreground mb-6">
            Pour soumettre votre candidature au programme UK Level 3 Foundation Diploma, veuillez remplir le formulaire de candidature.
          </p>
          
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard/profile">
              Commencer une candidature
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Has application - show dashboard
  const paymentCompleted = application.payment_status === 'Confirmed' || application.payment_status === 'Waived'

  // Progress steps
  const progressSteps = [
    { id: 1, name: 'Profil', status: 'completed', href: '/dashboard/profile' },
    { id: 2, name: 'Historique académique', status: 'completed', href: '/dashboard/academic' },
    { id: 3, name: 'Paiement', status: paymentCompleted ? 'completed' : 'pending', href: '/dashboard/payment' },
    { id: 4, name: 'Documents', status: 'pending', href: '/dashboard/documents' },
    { id: 5, name: 'Bourse', status: 'pending', href: '/dashboard/scholarship' },
  ]

  return (
    <div className="max-w-6xl">
      {/* Header with user info */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {applicant?.prenom} {applicant?.nom}
              </h1>
              <p className="text-muted-foreground">{applicant?.email}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Candidature</p>
            <p className="font-semibold">#{application.applicant_id}</p>
          </div>
        </div>
      </div>

      {/* Progress Tracker */}
      <div className="bg-card border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Progression de votre candidature</h2>
        <div className="flex items-center justify-between">
          {progressSteps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step.status === 'completed' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {step.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </div>
                <span className="text-xs mt-1 text-center">{step.name}</span>
              </div>
              {index < progressSteps.length - 1 && (
                <div className={`w-16 h-0.5 mx-2 ${
                  step.status === 'completed' ? 'bg-green-200' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Application Status Card */}
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              application.application_status === 'en_cours_devaluation'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {application.application_status === 'en_cours_devaluation' && 'En cours'}
              {application.application_status === 'en_attente' && 'En attente'}
              {application.application_status === 'Admission définitive' && 'Admis'}
              {application.application_status === 'Admission sous réserve' && 'Sous réserve'}
              {application.application_status === 'Dossier refusé' && 'Refusé'}
            </span>
          </div>
          <h3 className="font-semibold mb-1">Statut de la candidature</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {application.application_status === 'en_cours_devaluation' && 'Votre dossier est en cours d\'évaluation'}
            {application.application_status === 'en_attente' && 'Votre dossier est en attente de traitement'}
            {application.application_status === 'Admission définitive' && 'Félicitations! Vous êtes admis'}
            {application.application_status === 'Admission sous réserve' && 'Admis sous conditions'}
            {application.application_status === 'Dossier refusé' && 'Votre candidature a été refusée'}
          </p>
          <Link href="#" className="text-primary text-sm font-medium flex items-center gap-1">
            Voir les détails
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Payment Status Card */}
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              paymentCompleted ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              <CreditCard className={`h-5 w-5 ${paymentCompleted ? 'text-green-600' : 'text-yellow-600'}`} />
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              paymentCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {paymentCompleted ? 'Payé' : 'En attente'}
            </span>
          </div>
          <h3 className="font-semibold mb-1">Paiement des frais</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {paymentCompleted 
              ? `Frais de dossier payés: ${application.payment_amount_paid} USD`
              : 'Frais de dossier: 29 USD'
            }
          </p>
          {!paymentCompleted && (
            <Link href="/dashboard/payment" className="text-primary text-sm font-medium flex items-center gap-1">
              Payer maintenant
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {/* Documents Status Card */}
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Upload className="h-5 w-5 text-purple-600" />
            </div>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              0/4
            </span>
          </div>
          <h3 className="font-semibold mb-1">Documents requis</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Carte d'identité, bulletins scolaires
          </p>
          <Link href="/dashboard/documents" className="text-primary text-sm font-medium flex items-center gap-1">
            Télécharger
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Academic History */}
        <Link href="/dashboard/academic" className="block">
          <div className="bg-card border rounded-lg p-6 hover:border-primary transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Historique académique</h3>
                <p className="text-sm text-muted-foreground">
                  Renseignez vos notes et diplômes
                </p>
              </div>
            </div>
          </div>
        </Link>

        {/* Documents */}
        <Link href="/dashboard/documents" className="block">
          <div className="bg-card border rounded-lg p-6 hover:border-primary transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Documents requis</h3>
                <p className="text-sm text-muted-foreground">
                  Téléchargez vos documents justificatifs
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Scholarship Section */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Video className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Bourse d'études disponible</h3>
              <p className="text-muted-foreground mb-4">
                Postulez pour une bourse d'études en soumettant une vidéo de présentation. 
                Les bourses sont attribuées aux étudiants méritants selon leurs notes et leur situation.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/dashboard/scholarship">
                  <Button className="w-full sm:w-auto">
                    Postuler maintenant
                  </Button>
                </Link>
                <Button variant="outline" className="w-full sm:w-auto">
                  En savoir plus
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      {!paymentCompleted && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900 mb-1">Paiement requis</h4>
            <p className="text-sm text-yellow-800">
              Veuillez effectuer le paiement de 29 USD pour que votre candidature soit traitée.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
