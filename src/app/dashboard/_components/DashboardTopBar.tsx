'use client'

/**
 * DashboardTopBar
 *
 * Fixed top navigation bar for the applicant dashboard.
 *
 * Mobile  : full-width (left-0), shows a hamburger button on the left that
 *           calls onMenuOpen() to open the sidebar drawer.
 * Desktop : offset by the sidebar width (lg:left-64), hamburger hidden.
 *
 * Displays: hamburger (mobile), applicant avatar, full name, "Candidat" badge,
 * student number (when application exists), and logout button.
 */

import { useRouter } from 'next/navigation'
import { LogOut, Menu } from 'lucide-react'
import { useApplication } from '@/lib/context/ApplicationContext'
import { createClient } from '@/lib/supabase/client'

interface Props {
  onMenuOpen: () => void
}

export default function DashboardTopBar({ onMenuOpen }: Props) {
  const router = useRouter()
  const { applicant, application, loading } = useApplication()

  const initials =
    applicant
      ? `${applicant.prenom.charAt(0)}${applicant.nom.charAt(0)}`.toUpperCase()
      : '?'

  const fullName = loading
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
      className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center
                 border-b border-slate-200/80 bg-white/80 px-4
                 backdrop-blur-md lg:left-64 lg:px-6"
    >
      {/* ── Left: hamburger (mobile only) ──────────────────────────────── */}
      <button
        onClick={onMenuOpen}
        aria-label="Ouvrir le menu de navigation"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md
                   text-slate-500 transition-colors hover:bg-slate-100
                   hover:text-slate-800 focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-[#4EA6F5]
                   lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* ── Right: user info — pushed to far right via ml-auto ──────────── */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">

        {/* Avatar */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center
                     rounded-md bg-[#021463] text-[13px] font-bold
                     tracking-wide text-white"
          aria-hidden="true"
        >
          {initials}
        </div>

        {/* Name + badge + student number — hidden on very small screens */}
        <div className="hidden sm:block">
          {loading ? (
            <div className="space-y-1.5">
              <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-2.5 w-20 animate-pulse rounded bg-slate-100" />
            </div>
          ) : (
            <>
              <p className="max-w-[140px] truncate text-sm font-semibold
                            leading-tight text-slate-800 sm:max-w-none">
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
        <div className="mx-0.5 h-8 w-px bg-slate-200 sm:mx-1" aria-hidden="true" />

        {/* Logout */}
        <button
          onClick={handleSignOut}
          title="Se déconnecter"
          aria-label="Se déconnecter"
          className="flex h-10 w-10 items-center justify-center rounded-md
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
