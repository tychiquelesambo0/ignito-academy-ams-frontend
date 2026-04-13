'use client'

/**
 * StepGate
 *
 * Wraps any dashboard page that has a prerequisite.
 * If the step is locked (prerequisite not yet completed), renders a friendly
 * lock screen instead of the page children.
 * If unlocked, renders children as-is.
 *
 * Usage:
 *   <StepGate stepId="academic-history">
 *     <AcademicHistoryForm />
 *   </StepGate>
 */

import Link from 'next/link'
import { Lock, ChevronRight } from 'lucide-react'
import { useApplicationSteps } from '@/lib/hooks/useApplicationSteps'
import { useApplication } from '@/lib/context/ApplicationContext'
import FormPageSkeleton from '@/components/skeletons/FormPageSkeleton'

interface Props {
  stepId: string
  children: React.ReactNode
}

export default function StepGate({ stepId, children }: Props) {
  const { loading } = useApplication()
  const steps       = useApplicationSteps()

  // While the context is loading we can't yet determine lock state —
  // show a skeleton to avoid a flash of the lock screen then the real content.
  if (loading) return <FormPageSkeleton />

  const step = steps.find((s) => s.id === stepId)

  // Unknown stepId or step is accessible → render normally
  if (!step || step.unlocked) return <>{children}</>

  // ── Locked ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-[62vh] flex-col items-center justify-center">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-400">
        <div className="rounded-lg bg-white p-10 text-center shadow-sm">

          {/* Lock icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-slate-50">
            <Lock className="h-7 w-7 text-slate-300" />
          </div>

          <h2 className="font-serif text-xl font-semibold text-slate-800">
            Étape verrouillée
          </h2>

          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
            Pour accéder à{' '}
            <span className="font-semibold text-slate-700">{step.label}</span>,
            vous devez d'abord compléter et enregistrer{' '}
            <span className="font-semibold text-slate-700">
              {step.prerequisiteLabel}
            </span>
            .
          </p>

          {step.prerequisiteHref && (
            <Link
              href={step.prerequisiteHref}
              className="mt-7 inline-flex h-11 items-center justify-center gap-2
                         rounded-md bg-[#021463] px-6 text-sm font-semibold text-white
                         transition-colors hover:bg-[#031a80]
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-[#4EA6F5]"
            >
              Compléter {step.prerequisiteLabel}
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
