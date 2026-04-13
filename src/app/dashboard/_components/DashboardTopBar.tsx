'use client'

/**
 * DashboardTopBar
 *
 * Fixed top navigation bar for the applicant dashboard.
 * Displays: applicant avatar (initials), full name, "Candidat" badge, logout.
 * Consumes ApplicationContext for real-time profile data.
 */

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useApplication } from '@/lib/context/ApplicationContext'
import { createClient } from '@/lib/supabase/client'

export default function DashboardTopBar() {
  const router = useRouter()
  const { applicant, application, loading } = useApplication()

  const initials =
    applicant
      ? `${applicant.prenom.charAt(0)}${applicant.nom.charAt(0)}`.toUpperCase()
      : '?'

  const fullName =
    loading
      ? ''
      : applicant
        ? `${applicant.prenom} ${applicant.nom}`
        : 'Candidat'

  const studentNumber = application?.applicant_id ?? null

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header
      className="fixed left-64 right-0 top-0 z-10 flex h-16 items-center
                 justify-end border-b border-slate-200/80 bg-white/80
                 px-6 backdrop-blur-md"
    >
      <div className="flex items-center gap-3">

        {/* Avatar */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center
                     rounded-md bg-[#021463] text-[13px] font-bold text-white
                     tracking-wide"
          aria-hidden="true"
        >
          {initials}
        </div>

        {/* Name + student number + badge */}
        <div className="hidden sm:block">
          {loading ? (
            <div className="space-y-1.5">
              <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-2.5 w-20 animate-pulse rounded bg-slate-100" />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-800 leading-tight">
                {fullName}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className="inline-flex items-center rounded px-1.5 py-0.5
                             text-[10px] font-semibold uppercase tracking-wide
                             bg-[#4EA6F5]/10 text-[#4EA6F5]"
                >
                  Candidat
                </span>
                {studentNumber && (
                  <>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span className="font-mono text-[10px] font-semibold text-slate-400">
                      {studentNumber}
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="mx-1 h-8 w-px bg-slate-200" aria-hidden="true" />

        {/* Logout */}
        <button
          onClick={handleSignOut}
          title="Se déconnecter"
          aria-label="Se déconnecter"
          className="flex h-9 w-9 items-center justify-center rounded-md
                     text-slate-400 transition-colors
                     hover:bg-red-50 hover:text-red-500
                     focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-[#4EA6F5]"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
