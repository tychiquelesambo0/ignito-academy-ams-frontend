'use client'

import { CheckCircle2, Clock, FileCheck, UserCheck, XCircle, AlertCircle } from 'lucide-react'

type ApplicationStatus =
  | 'Dossier Créé'
  | 'en_cours_devaluation'
  | 'Admission sous réserve'
  | 'Admission définitive'
  | 'Dossier refusé'
  // legacy value kept for backward compat with old records
  | 'Frais Réglés'

type PaymentStatus = 'Pending' | 'Confirmed' | 'paid' | 'Failed'

interface ApplicationStatusTrackerProps {
  applicationStatus: ApplicationStatus
  paymentStatus: PaymentStatus
  applicantId: string
}

// ─── 3-step pipeline ──────────────────────────────────────────────────────────

const STEPS = [
  { key: 'dossier_cree',          label: 'Dossier créé',          short: '1' },
  { key: 'en_cours_devaluation',  label: "En cours d'évaluation", short: '2' },
  { key: 'decision_finale',       label: 'Décision finale',       short: '3' },
]

const DECISION_STATUSES: ApplicationStatus[] = [
  'Admission sous réserve',
  'Admission définitive',
  'Dossier refusé',
]

// Maps any DB status → which step index (0-based) is currently active.
// paymentStatus is used as a safety override: once payment is confirmed the
// applicant is at minimum in Step 2, regardless of application_status.
function resolveStepIndex(status: ApplicationStatus, paymentStatus: PaymentStatus): number {
  if (DECISION_STATUSES.includes(status)) return 2
  if (status === 'en_cours_devaluation' || status === 'Admission sous réserve') return 1
  // 'Frais Réglés' is legacy — treat same as en_cours_devaluation
  if (status === 'Frais Réglés') return 1
  // Payment confirmed but application_status not yet synced → advance to step 2
  if (paymentStatus === 'paid' || paymentStatus === 'Confirmed') return 1
  return 0 // 'Dossier Créé' or unknown
}

// ─── Status badge config ──────────────────────────────────────────────────────

const statusBadgeConfig: Record<string, {
  label: string
  classes: string
  icon: React.ComponentType<{ className?: string }>
}> = {
  'Dossier Créé':              { label: 'Dossier créé',           classes: 'bg-slate-100 text-slate-600 border-slate-200',       icon: FileCheck },
  'en_cours_devaluation':      { label: "En cours d'évaluation",  classes: 'bg-amber-50 text-amber-700 border-amber-200',        icon: Clock },
  'Frais Réglés':              { label: "En cours d'évaluation",  classes: 'bg-amber-50 text-amber-700 border-amber-200',        icon: Clock },
  'Admission sous réserve':    { label: 'Admission sous réserve', classes: 'bg-orange-50 text-orange-700 border-orange-200',     icon: AlertCircle },
  'Admission définitive':      { label: 'Admission définitive',   classes: 'bg-[#10B981]/10 text-[#065f46] border-[#10B981]/25', icon: UserCheck },
  'Dossier refusé':            { label: 'Dossier refusé',         classes: 'bg-red-50 text-red-700 border-red-200',              icon: XCircle },
}

// Color of the step-3 circle based on the decision received
const DECISION_CIRCLE: Record<string, string> = {
  'Admission définitive':   'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30',
  'Dossier refusé':         'bg-red-500     text-white shadow-sm shadow-red-500/30',
  'Admission sous réserve': 'bg-amber-500   text-white shadow-sm shadow-amber-500/30',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ApplicationStatusTracker({
  applicationStatus,
  paymentStatus,
  applicantId,
}: ApplicationStatusTrackerProps) {
  const currentStepIndex = resolveStepIndex(applicationStatus, paymentStatus)

  // If payment is confirmed but app_status hasn't synced, display as "En cours"
  const effectiveStatus: string =
    (applicationStatus === 'Dossier Créé' && (paymentStatus === 'paid' || paymentStatus === 'Confirmed'))
      ? 'en_cours_devaluation'
      : applicationStatus

  const badge = statusBadgeConfig[effectiveStatus] ?? statusBadgeConfig['Dossier Créé']
  const BadgeIcon = badge.icon

  // For the final step, show the specific decision label
  const resolvedStepLabel = (index: number) => {
    if (index === 2 && DECISION_STATUSES.includes(applicationStatus as ApplicationStatus)) {
      return badge.label
    }
    return STEPS[index].label
  }

  return (
    <div className="space-y-4">

      {/* ── Top row: Applicant ID + status badge ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Official ID card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-[#4EA6F5] p-4 sm:p-5">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mb-1.5">
            Identifiant de candidature
          </p>
          <p className="font-mono text-lg sm:text-2xl font-bold text-[#021463] tracking-wide leading-none break-all">
            {applicantId}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Conservez cet identifiant pour toute correspondance.
          </p>
        </div>

        {/* Status badge card */}
        <div className={`rounded-xl border p-4 sm:p-5 flex items-center gap-3 sm:gap-4 ${badge.classes}`}>
          <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
            <BadgeIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70 mb-1">
              Statut actuel
            </p>
            <p className="font-serif text-base sm:text-lg font-bold leading-tight">{badge.label}</p>
          </div>
        </div>
      </div>

      {/* ── 3-step visual stepper ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-4 sm:mb-5">
          Progression du dossier
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentStepIndex
            const isActive    = index === currentStepIndex
            const isPending   = index > currentStepIndex

            // Step 3 with a decision: use colour-coded tick
            const isDecisionActive = index === 2 && isActive && DECISION_STATUSES.includes(applicationStatus)
            const decisionCircleClass = isDecisionActive ? DECISION_CIRCLE[applicationStatus] ?? '' : ''

            return (
              <div key={step.key} className="flex sm:flex-1 flex-row sm:flex-col items-center gap-3 sm:gap-0 w-full sm:w-auto">

                {/* Circle + connectors */}
                <div className="flex flex-row sm:flex-col items-center sm:w-full">
                  {index > 0 && (
                    <div className={`hidden sm:block h-0.5 flex-1 ${isCompleted || isActive ? 'bg-[#4EA6F5]' : 'bg-slate-200'}`} />
                  )}
                  {index > 0 && (
                    <div className={`sm:hidden w-0.5 h-4 mr-3 ${isCompleted || isActive ? 'bg-[#4EA6F5]' : 'bg-slate-200'}`} />
                  )}

                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm transition-all
                    ${isDecisionActive  ? decisionCircleClass
                    : isCompleted       ? 'bg-[#4EA6F5] text-white shadow-sm shadow-[#4EA6F5]/30'
                    : isActive          ? 'bg-[#021463] text-white shadow-sm shadow-[#021463]/20'
                    :                     'bg-slate-100 text-slate-400'}`}
                  >
                    {(isCompleted || isDecisionActive)
                      ? <CheckCircle2 className="w-5 h-5" />
                      : <span>{step.short}</span>}
                  </div>

                  {index < STEPS.length - 1 && (
                    <div className={`hidden sm:block h-0.5 flex-1 ${isCompleted ? 'bg-[#4EA6F5]' : 'bg-slate-200'}`} />
                  )}
                </div>

                {/* Label */}
                <p className={`text-xs mt-0 sm:mt-2 sm:text-center leading-tight
                  ${isDecisionActive  ? 'font-semibold ' + (
                      applicationStatus === 'Admission définitive'   ? 'text-emerald-700' :
                      applicationStatus === 'Dossier refusé'         ? 'text-red-600'     :
                                                                        'text-amber-700')
                  : isActive          ? 'font-semibold text-[#021463]'
                  : isCompleted       ? 'font-medium text-[#4EA6F5]'
                  :                     'text-slate-400'}`}
                >
                  {resolvedStepLabel(index)}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
