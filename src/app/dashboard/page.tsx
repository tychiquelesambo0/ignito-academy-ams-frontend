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
import { Loader2, FileText, CreditCard, GraduationCap, Award, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

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

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Bienvenue, {applicant?.prenom} {applicant?.nom}
        </h1>
        <p className="text-muted-foreground">
          Suivez l'état de votre candidature et gérez vos documents justificatifs.
        </p>
      </div>

      {/* Application Info Card */}
      <div className="bg-card border rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Candidature {application.intake_year}</h2>
            <p className="text-sm text-muted-foreground">ID: {application.applicant_id}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            application.application_status === 'Admission définitive'
              ? 'bg-green-100 text-green-800'
              : application.application_status === 'en_cours_devaluation'
              ? 'bg-blue-100 text-blue-800'
              : application.application_status === 'en_attente'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {application.application_status === 'en_attente' && 'En attente'}
            {application.application_status === 'en_cours_devaluation' && 'En cours d\'évaluation'}
            {application.application_status === 'Admission définitive' && 'Admission définitive'}
            {application.application_status === 'Admission sous réserve' && 'Admission sous réserve'}
            {application.application_status === 'Dossier refusé' && 'Dossier refusé'}
          </div>
        </div>

        {application.ecole_provenance && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">École de provenance</p>
              <p className="font-medium">{application.ecole_provenance}</p>
            </div>
            {application.option_academique && (
              <div>
                <p className="text-muted-foreground">Option académique</p>
                <p className="font-medium">{application.option_academique}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Payment */}
        <Link href="/dashboard/payment" className="block">
          <div className="bg-card border rounded-lg p-6 hover:border-primary transition-colors">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                paymentCompleted ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                <CreditCard className={`h-6 w-6 ${paymentCompleted ? 'text-green-600' : 'text-yellow-600'}`} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Paiement</h3>
                <p className="text-sm text-muted-foreground">
                  {paymentCompleted ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Payé ({application.payment_amount_paid} USD)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow-600">
                      <Clock className="h-4 w-4" />
                      En attente (29 USD)
                    </span>
                  )}
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
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Documents</h3>
                <p className="text-sm text-muted-foreground">
                  Téléchargez vos documents justificatifs
                </p>
              </div>
            </div>
          </div>
        </Link>

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

        {/* Scholarship */}
        <Link href="/dashboard/scholarship" className="block">
          <div className="bg-card border rounded-lg p-6 hover:border-primary transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Award className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Bourse d'études</h3>
                <p className="text-sm text-muted-foreground">
                  Postulez pour une bourse
                </p>
              </div>
            </div>
          </div>
        </Link>
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
