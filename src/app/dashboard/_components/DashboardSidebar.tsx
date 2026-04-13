'use client'

/**
 * DashboardSidebar
 *
 * Fixed left navigation for the applicant dashboard.
 * Design: "Le Conservateur Numérique" — Primary Navy #021463.
 *
 * Mobile  : hidden off-screen, slides in as a drawer when isOpen = true.
 *           A dark scrim covers the page behind it; tap scrim or X to close.
 *           Auto-closes whenever the pathname changes (user tapped a link).
 * Desktop : always visible via lg:translate-x-0, isOpen has no visual effect.
 *
 * Nav item states (from useApplicationSteps):
 *   active    → #4EA6F5 accent + left bar
 *   completed → green CheckCircle2 badge (non-active)
 *   locked    → dimmed + Lock icon, rendered as <span> (not a link)
 *   available → white/60, hover brightens
 */

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Lock, CheckCircle2, X, Info } from 'lucide-react'
import { useApplicationSteps } from '@/lib/hooks/useApplicationSteps'
import { useApplication } from '@/lib/context/ApplicationContext'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function DashboardSidebar({ isOpen, onClose }: Props) {
  const pathname = usePathname()
  const { loading, application } = useApplication()
  const steps = useApplicationSteps()

  // Derive scholarship-specific lock reason for the tooltip
  const paymentConfirmed =
    application?.payment_status === 'Confirmed' ||
    application?.payment_status === 'Waived'
  const scholarshipIneligible =
    paymentConfirmed && application?.is_scholarship_eligible === false

  // Auto-close on mobile when the user navigates to a new page
  useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const isActive = (href: string, id: string) =>
    id === 'dashboard'
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* ── Dark backdrop — mobile only, renders when drawer is open ──────── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={[
          'fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* ── Sidebar drawer ─────────────────────────────────────────────────── */}
      <aside
        className={[
          // Base
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-[#021463]',
          // Smooth slide transition
          'transition-transform duration-300 ease-in-out will-change-transform',
          // Mobile: off-screen by default, slides in when open
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: always visible, ignore JS state
          'lg:translate-x-0 lg:w-64',
        ].join(' ')}
      >

        {/* ── Logo row ─────────────────────────────────────────────────────── */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
          <Image
            src="/ignito-logo-white.svg"
            alt="Ignito Academy"
            width={30}
            height={30}
            className="shrink-0"
            priority
          />
          <span className="flex-1 font-serif text-[17px] font-semibold leading-tight text-white">
            Ignito Academy
          </span>

          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            aria-label="Fermer le menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md
                       text-white/50 hover:bg-white/10 hover:text-white
                       transition-colors lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Navigation ───────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">
            Mon Dossier
          </p>

          <ul className="space-y-0.5">
            {steps.map((step) => {
              const active    = isActive(step.href, step.id)
              const locked    = !step.unlocked
              const completed = step.completed && !active
              const Icon      = step.icon

              // ── Locked item — not a link ──────────────────────────────────
              if (locked) {
                const isScholarshipStep = step.id === 'scholarship'

                // For the scholarship step, determine the specific reason message.
                // For all other locked steps, keep the generic lock icon only.
                let expandedMsg: string | null = null
                if (isScholarshipStep && scholarshipIneligible) {
                  expandedMsg =
                    "Votre dossier académique ne remplit pas les critères requis : moyenne ≥ 70 % en Terminale et à l'EXETAT."
                } else if (isScholarshipStep) {
                  expandedMsg =
                    'Finalisez votre paiement des frais de dossier pour débloquer cette étape.'
                }

                return (
                  <li key={step.id} className="group/locked">
                    {/* Row */}
                    <span
                      aria-disabled="true"
                      className="flex min-h-[48px] cursor-not-allowed items-center gap-3
                                 rounded-md px-3 py-2.5 text-sm font-medium
                                 text-white/25 select-none"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-white/20" />
                      <span className="flex-1 truncate">{step.label}</span>
                      {isScholarshipStep
                        ? <Info className="h-3.5 w-3.5 shrink-0 text-white/30" />
                        : <Lock className="h-3 w-3 shrink-0 text-white/20" />
                      }
                    </span>

                    {/* Inline expanding message — slides open on hover.
                        Stays fully inside the sidebar so overflow-y-auto
                        on the nav never clips it. */}
                    {expandedMsg && (
                      <div
                        className="mx-2 mb-1 max-h-0 overflow-hidden
                                   transition-all duration-200 ease-in-out
                                   group-hover/locked:max-h-24"
                      >
                        <p className="rounded-md bg-white/6 px-3 py-2
                                      text-[11px] leading-relaxed text-white/45">
                          {expandedMsg}
                        </p>
                      </div>
                    )}
                  </li>
                )
              }

              // ── Clickable item ────────────────────────────────────────────
              return (
                <li key={step.id}>
                  <Link
                    href={step.href}
                    className={[
                      'group relative flex min-h-[48px] items-center gap-3',
                      'rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-[#4EA6F5]/15 text-[#4EA6F5]'
                        : 'text-white/60 hover:bg-white/8 hover:text-white',
                    ].join(' ')}
                  >
                    {/* Active left accent bar */}
                    {active && (
                      <span
                        className="absolute left-0 h-7 w-0.5 rounded-r-full bg-[#4EA6F5]"
                        aria-hidden="true"
                      />
                    )}

                    <Icon
                      className={[
                        'h-4 w-4 shrink-0 transition-colors',
                        active
                          ? 'text-[#4EA6F5]'
                          : 'text-white/40 group-hover:text-white/70',
                      ].join(' ')}
                    />

                    <span className="flex-1 truncate">{step.label}</span>

                    {/* Completed badge */}
                    {completed && (
                      <CheckCircle2
                        className="h-3.5 w-3.5 shrink-0 text-[#10B981]/70"
                        aria-label="Étape complétée"
                      />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-white/10 px-5 py-4">
          <p className="text-[11px] leading-snug text-white/35">
            UK Level 3 Foundation Diploma
          </p>
          <p className="mt-0.5 text-[11px] text-white/25">Promotion 2026</p>
        </div>
      </aside>
    </>
  )
}
