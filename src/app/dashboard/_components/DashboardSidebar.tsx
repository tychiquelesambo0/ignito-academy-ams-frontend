'use client'

/**
 * DashboardSidebar
 *
 * Fixed left navigation for the applicant dashboard.
 * Design: "Le Conservateur Numérique" — Primary Navy #021463.
 *
 * Each nav item reflects the step's state from useApplicationSteps():
 *   active    → #4EA6F5 accent + left bar
 *   completed → subtle green dot indicator (non-active completed steps)
 *   locked    → dimmed text + Lock icon, rendered as <span> (not clickable)
 *   available → default white/60
 */

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Lock, CheckCircle2 } from 'lucide-react'
import { useApplicationSteps } from '@/lib/hooks/useApplicationSteps'
import { useApplication } from '@/lib/context/ApplicationContext'

export default function DashboardSidebar() {
  const pathname = usePathname()
  const { loading } = useApplication()
  const steps = useApplicationSteps()

  const isActive = (href: string, id: string) =>
    id === 'dashboard'
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-[#021463]">

      {/* ── Logo ── */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
        <Image
          src="/ignito-logo-white.svg"
          alt="Ignito Academy"
          width={30}
          height={30}
          className="shrink-0"
          priority
        />
        <span className="font-serif text-[17px] font-semibold leading-tight text-white">
          Ignito Academy
        </span>
      </div>

      {/* ── Navigation ── */}
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

            // ── Locked item — not a link ───────────────────────────────────
            if (locked) {
              return (
                <li key={step.id}>
                  <span
                    aria-disabled="true"
                    title={`Complétez "${step.prerequisiteLabel}" pour déverrouiller`}
                    className="flex min-h-[44px] cursor-not-allowed items-center gap-3
                               rounded-md px-3 py-2.5 text-sm font-medium text-white/25
                               select-none"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-white/20" />
                    <span className="flex-1 truncate">{step.label}</span>
                    <Lock className="h-3 w-3 shrink-0 text-white/20" />
                  </span>
                </li>
              )
            }

            // ── Loading shimmer for non-locked items while context resolves ─
            if (loading && step.id !== 'dashboard' && step.id !== 'profile') {
              return null // locked items already rendered above; these will show once loaded
            }

            // ── Clickable item ─────────────────────────────────────────────
            return (
              <li key={step.id}>
                <Link
                  href={step.href}
                  className={[
                    'group relative flex min-h-[44px] items-center gap-3',
                    'rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-[#4EA6F5]/15 text-[#4EA6F5]'
                      : 'text-white/60 hover:bg-white/8 hover:text-white',
                  ].join(' ')}
                >
                  {/* Left accent bar — active only */}
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

                  {/* Completed indicator — green dot on non-active completed steps */}
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

      {/* ── Footer ── */}
      <div className="shrink-0 border-t border-white/10 px-5 py-4">
        <p className="text-[11px] leading-snug text-white/35">
          UK Level 3 Foundation Diploma
        </p>
        <p className="mt-0.5 text-[11px] text-white/25">Promotion 2026</p>
      </div>
    </aside>
  )
}
