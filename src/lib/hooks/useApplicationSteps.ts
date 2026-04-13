'use client'

/**
 * useApplicationSteps
 *
 * Single source of truth for the unlock and completion state of every
 * step in the applicant's journey.  Derived entirely from ApplicationContext
 * so it stays in sync with real-time DB updates and refetch() calls.
 *
 * Unlock chain:
 *   Profile (always) → Academic History → Documents → Payment → Scholarship*
 *   (*Scholarship only if is_scholarship_eligible === true)
 */

import { useMemo } from 'react'
import {
  LayoutDashboard,
  User,
  GraduationCap,
  CreditCard,
  FileText,
  Award,
  type LucideIcon,
} from 'lucide-react'
import { useApplication } from '@/lib/context/ApplicationContext'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApplicationStep {
  id: string
  label: string
  href: string
  icon: LucideIcon
  /** User may navigate to this page */
  unlocked: boolean
  /** User has successfully saved meaningful data for this step */
  completed: boolean
  /** Human-readable label of the step that must be done first */
  prerequisiteLabel: string | null
  /** Href of the prerequisite step, for the lock-screen CTA */
  prerequisiteHref: string | null
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useApplicationSteps(): ApplicationStep[] {
  const { applicant, application } = useApplication()

  return useMemo<ApplicationStep[]>(() => {
    // ── Completion flags ─────────────────────────────────────────────────────

    // Profile is "complete" when the address section is fully filled
    const profileComplete = !!(
      applicant?.adresse_complete?.trim() &&
      applicant?.commune?.trim() &&
      applicant?.ville?.trim() &&
      applicant?.province?.trim()
    )

    // Academic history is "complete" when at least the school and grade 10 are saved
    const academicComplete = !!(
      application?.ecole_provenance?.trim() &&
      application?.grade_10_average !== null &&
      application?.grade_10_average !== undefined
    )

    // Documents page sets this flag to true once the applicant submits their files
    const documentsSubmitted = application?.documents_submitted === true

    const paymentComplete =
      application?.payment_status === 'Confirmed' ||
      application?.payment_status === 'Waived'

    const scholarshipEligible =
      paymentComplete && application?.is_scholarship_eligible === true

    // ── Steps ────────────────────────────────────────────────────────────────
    // Order: Profile → Academic History → Documents → Payment → Scholarship

    return [
      {
        id: 'dashboard',
        label: 'Tableau de bord',
        href: '/dashboard',
        icon: LayoutDashboard,
        unlocked: true,
        completed: false,
        prerequisiteLabel: null,
        prerequisiteHref: null,
      },
      {
        id: 'profile',
        label: 'Mon Profil',
        href: '/dashboard/profile',
        icon: User,
        unlocked: true,
        completed: profileComplete,
        prerequisiteLabel: null,
        prerequisiteHref: null,
      },
      {
        id: 'academic-history',
        label: 'Parcours Scolaire',
        href: '/dashboard/academic-history',
        icon: GraduationCap,
        unlocked: profileComplete,
        completed: academicComplete,
        prerequisiteLabel: 'Mon Profil',
        prerequisiteHref: '/dashboard/profile',
      },
      {
        id: 'documents',
        label: 'Documents',
        href: '/dashboard/documents',
        icon: FileText,
        unlocked: academicComplete,
        completed: documentsSubmitted,
        prerequisiteLabel: 'Parcours Scolaire',
        prerequisiteHref: '/dashboard/academic-history',
      },
      {
        id: 'payment',
        label: 'Paiement',
        href: '/dashboard/payment',
        icon: CreditCard,
        unlocked: academicComplete && documentsSubmitted,
        completed: paymentComplete,
        prerequisiteLabel: 'Documents',
        prerequisiteHref: '/dashboard/documents',
      },
      {
        id: 'scholarship',
        label: "Bourse d'Excellence",
        href: '/dashboard/scholarship',
        icon: Award,
        unlocked: scholarshipEligible,
        completed: !!application?.scholarship_video_url,
        prerequisiteLabel: scholarshipEligible ? null : 'Paiement (et éligibilité confirmée)',
        prerequisiteHref: scholarshipEligible ? null : '/dashboard/payment',
      },
    ]
  }, [applicant, application])
}
