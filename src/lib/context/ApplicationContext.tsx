'use client'

/**
 * ApplicationContext
 *
 * Single source of truth for the authenticated applicant's profile and
 * application record throughout the entire dashboard.
 *
 * Behaviour:
 *  - Fetches applicant profile + most-recent application on mount.
 *  - Subscribes to Supabase Realtime for live payment / status updates.
 *  - Exposes a `refetch` method so child pages can trigger a manual refresh.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Domain Types ─────────────────────────────────────────────────────────────
// Field names match the live schema: 20260410000001_fresh_ams_schema.sql

export interface Applicant {
  id: string
  prenom: string
  postnom: string | null        // optional middle name — culturally standard in DRC
  nom: string
  email: string
  phone_number: string
  date_naissance: string
  lieu_naissance: string | null
  sexe: string | null
  nationalite: string | null
  adresse_complete: string | null
  commune: string | null        // suburb / commune
  ville: string | null
  province: string | null
  code_postal: string | null    // optional postal code
  created_at: string
  updated_at: string
}

export interface Application {
  id: string
  applicant_id: string
  user_id: string
  intake_year: number

  // Academic background
  ecole_provenance: string | null
  option_academique: string | null
  exam_status: string | null

  // Grades & scholarship eligibility
  grade_10_average: number | null
  grade_11_average: number | null
  grade_12_average: number | null
  exetat_percentage: number | null
  graduation_year: number | null
  is_scholarship_eligible: boolean
  scholarship_status: string
  scholarship_video_url: string | null
  scholarship_awarded_at: string | null

  // English proficiency (CEFR — separate from scholarship eligibility)
  english_proficiency_level: string | null

  // Status
  application_status: string
  payment_status: string
  payment_currency: string
  payment_amount_paid: number | null
  transaction_id: string | null
  payment_confirmed_at: string | null

  // Document submission gate (set to true on the Documents page before payment)
  documents_submitted: boolean

  /** Message from admissions (demande de pièce complémentaire, admission sous réserve, etc.) */
  conditional_message: string | null

  // Optimistic locking
  version: number

  created_at: string
  updated_at: string
}

// ─── Context Shape ────────────────────────────────────────────────────────────

interface ApplicationContextValue {
  applicant: Applicant | null
  application: Application | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// ─── Context & Hook ───────────────────────────────────────────────────────────

const ApplicationContext = createContext<ApplicationContextValue | null>(null)

export function useApplication(): ApplicationContextValue {
  const ctx = useContext(ApplicationContext)
  if (!ctx) {
    throw new Error(
      'useApplication() doit être utilisé à l\'intérieur de <ApplicationProvider>.',
    )
  }
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const [applicant, setApplicant] = useState<Applicant | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Data fetcher ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        setError('Session expirée. Veuillez vous reconnecter.')
        setLoading(false)
        return
      }

      // Fetch applicant profile (applicants.id = auth.uid())
      const { data: applicantData, error: applicantError } = await supabase
        .from('applicants')
        .select('*')
        .eq('id', user.id)
        .single()

      if (applicantError && applicantError.code !== 'PGRST116') {
        console.error('[ApplicationContext] applicant fetch error:', applicantError)
        setError('Impossible de charger votre profil.')
        setLoading(false)
        return
      }

      // Fetch the most recent application for this user
      const { data: applicationData, error: applicationError } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (applicationError) {
        console.error('[ApplicationContext] application fetch error:', applicationError)
        setError('Impossible de charger votre dossier.')
        setLoading(false)
        return
      }

      setApplicant(applicantData ?? null)
      setApplication(applicationData ?? null)
      setError(null)
    } catch (err) {
      console.error('[ApplicationContext] unexpected error:', err)
      setError('Une erreur inattendue s\'est produite.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Supabase Realtime subscription ────────────────────────────────────────
  // Listens for any INSERT / UPDATE / DELETE on the user's application row
  // and triggers a full refetch to keep the UI in sync.

  useEffect(() => {
    const supabase = createClient()
    let cleanup: (() => void) | undefined

    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const channel = supabase
        .channel(`dashboard:application:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'applications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('[ApplicationContext] realtime update received:', payload.eventType)
            fetchData()
          },
        )
        .subscribe()

      cleanup = () => {
        supabase.removeChannel(channel)
      }
    }

    setupRealtime()

    return () => {
      cleanup?.()
    }
  }, [fetchData])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ApplicationContext.Provider
      value={{ applicant, application, loading, error, refetch: fetchData }}
    >
      {children}
    </ApplicationContext.Provider>
  )
}
