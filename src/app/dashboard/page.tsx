'use client'

/**
 * Dashboard Overview — src/app/dashboard/page.tsx
 *
 * Conditionally renders ONE of three mutually exclusive states driven
 * exclusively by ApplicationContext (no local Supabase calls):
 *
 *   STATE 1 — Empty      : application === null
 *   STATE 2 — In-Progress: application exists, payment not yet complete
 *   STATE 3 — Submitted  : payment_status is 'Confirmed' | 'Waived' | 'paid'
 *
 * Design system: "Le Conservateur Numérique"
 *   Navy #021463 · Blue #4EA6F5 · Green #10B981 · Amber #F59E0B · Error #EF4444
 *   font-serif (Crimson Pro) for all headings
 *   rounded-md / rounded-lg only — never rounded-full
 *   No red CTAs. Fee amount driven by APPLICATION_FEE_USD — no CDF.
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { APPLICATION_FEE_USD } from '@/lib/payment/currency'
import {
  FolderOpen,
  CheckCircle2,
  Lock,
  ChevronRight,
  User,
  GraduationCap,
  CreditCard,
  BadgeCheck,
  AlertCircle,
  FileText,
  Loader2,
} from 'lucide-react'
import { useApplication } from '@/lib/context/ApplicationContext'
import type { Applicant, Application } from '@/lib/context/ApplicationContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Payment statuses that lock the submission into State 3 */
const PAID_STATUSES = new Set(['Confirmed', 'Waived', 'paid'])

function isPaid(status: string): boolean {
  return PAID_STATUSES.has(status)
}

/** Maps DB application_status to a readable French label */
function appStatusLabel(status: string): string {
  const map: Record<string, string> = {
    'Dossier Créé': 'Dossier créé',
    'Frais Réglés': "En cours d'évaluation",
    "En cours d'évaluation": "En cours d'évaluation",
    'Admission sous réserve': 'Admission sous réserve',
    'Admission définitive': 'Admission définitive',
    'Dossier refusé': 'Dossier refusé',
  }
  return map[status] ?? "En cours de traitement"
}

// ─── Shared sub-components ────────────────────────────────────────────────────

/** Animated loading skeleton while context resolves */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-72 rounded-md bg-slate-200" />
        <div className="h-4 w-48 rounded-md bg-slate-200" />
      </div>
      <div className="h-28 rounded-lg bg-slate-200" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-52 rounded-lg bg-slate-200" />
        ))}
      </div>
    </div>
  )
}

/** Status badge — never rounded-full */
type BadgeVariant = 'completed' | 'required' | 'locked' | 'pending'

function StatusBadge({ variant, label }: { variant: BadgeVariant; label: string }) {
  const cls: Record<BadgeVariant, string> = {
    completed: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25',
    required:  'bg-amber-50 text-amber-600 border-amber-200',
    locked:    'bg-slate-100 text-slate-400 border-slate-200',
    pending:   'bg-[#4EA6F5]/10 text-[#4EA6F5] border-[#4EA6F5]/20',
  }
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls[variant]}`}
    >
      {label}
    </span>
  )
}

/** 4-step horizontal progress tracker */
type StepState = 'completed' | 'current' | 'pending'

interface ProgressStep {
  id: number
  label: string
  state: StepState
}

function ProgressTracker({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-slate-400">
        Progression de votre candidature
      </p>

      <div className="flex items-start">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex flex-1 flex-col items-center">
            {/* Row: left connector + circle + right connector */}
            <div className="flex w-full items-center">
              {/* Left connector */}
              {idx > 0 && (
                <div
                  className={`h-0.5 flex-1 transition-colors duration-300 ${
                    steps[idx - 1].state === 'completed'
                      ? 'bg-[#10B981]'
                      : 'bg-slate-200'
                  }`}
                />
              )}

              {/* Step node */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold transition-colors duration-300 ${
                  step.state === 'completed'
                    ? 'bg-[#10B981] text-white'
                    : step.state === 'current'
                    ? 'bg-[#021463] text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step.state === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </div>

              {/* Right connector */}
              {idx < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 transition-colors duration-300 ${
                    step.state === 'completed' ? 'bg-[#10B981]' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>

            {/* Label */}
            <span
              className={`mt-2.5 text-center text-[11px] font-semibold leading-tight ${
                step.state === 'completed'
                  ? 'text-[#10B981]'
                  : step.state === 'current'
                  ? 'text-[#021463]'
                  : 'text-slate-400'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── STATE 1 — Empty ──────────────────────────────────────────────────────────

function EmptyState({
  applicant,
  refetch,
}: {
  applicant: Applicant | null
  refetch: () => Promise<void>
}) {
  const router    = useRouter()
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const firstName = applicant?.prenom ?? 'Candidat'

  /**
   * Clicking "Commencer" is the moment the application row is born.
   * We POST to complete-signup (idempotent) → it generates the IGN-YYYY-XXXXX
   * applicant_id and inserts the applications record → we refetch the context
   * (which causes DashboardTopBar to render the student number) → navigate.
   */
  const handleStart = async () => {
    if (!applicant) return
    setStarting(true)
    setStartError(null)
    try {
      const res = await fetch('/api/auth/complete-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:         applicant.id,
          email:          applicant.email,
          prenom:         applicant.prenom,
          nom:            applicant.nom,
          phone_number:   applicant.phone_number,
          date_naissance: applicant.date_naissance,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? 'Erreur lors de la création du dossier.')
      }
      // Navigate immediately — no flash of InProgressState.
      // refetch() runs in the background; by the time the profile page
      // mounts, the context already has the new application + student number.
      router.push('/dashboard/profile')
      refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue. Veuillez réessayer.'
      setStartError(msg)
      setStarting(false)
    }
  }

  return (
    <div className="flex min-h-[62vh] flex-col items-center justify-center">
      <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Welcome heading */}
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-semibold text-slate-800">
            Bienvenue,&nbsp;{firstName}&nbsp;!
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Votre espace candidat Ignito Academy est prêt.
          </p>
        </div>

        {/* Empty card */}
        <div className="rounded-lg bg-white p-12 text-center shadow-sm">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-lg bg-slate-50">
            <FolderOpen className="h-10 w-10 text-slate-300" />
          </div>

          <h2 className="font-serif text-xl font-semibold text-slate-800">
            Aucun dossier en cours
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
            Constituez votre dossier de candidature au{' '}
            <span className="font-semibold text-slate-700">
              UK Level 3 Foundation Diploma
            </span>{' '}
            en quatre étapes simples.
          </p>

          {/* Inline error */}
          {startError && (
            <p className="mx-auto mt-4 max-w-sm rounded-md border border-[#EF4444]/20
                          bg-[#EF4444]/5 px-4 py-2.5 text-xs text-[#EF4444]">
              {startError}
            </p>
          )}

          {/* Primary CTA — creates the application + generates student number */}
          <button
            type="button"
            onClick={handleStart}
            disabled={starting || !applicant}
            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-md
                       bg-[#021463] px-8 text-sm font-semibold text-white
                       transition-colors hover:bg-[#031a80] disabled:cursor-not-allowed
                       disabled:opacity-60 focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-[#4EA6F5]"
          >
            {starting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Création du dossier…
              </>
            ) : (
              <>
                Commencer mon dossier d&apos;admission
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>

          {/* Steps mini-preview */}
          <div className="mt-10 grid grid-cols-4 gap-3 border-t border-slate-100 pt-8">
            {[
              { n: 1, label: 'Profil' },
              { n: 2, label: 'Parcours' },
              { n: 3, label: 'Documents' },
              { n: 4, label: 'Paiement' },
            ].map(({ n, label }) => (
              <div key={n} className="flex flex-col items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100">
                  <span className="text-[11px] font-bold text-slate-400">{n}</span>
                </div>
                <span className="text-[10px] font-medium text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── STATE 2 — In-Progress ────────────────────────────────────────────────────

function InProgressState({
  applicant,
  application,
}: {
  applicant: Applicant | null
  application: Application
}) {
  const profileCompleted   = !!applicant
  const parcoursCompleted  = application.grade_10_average !== null
  const documentsSubmitted = application.documents_submitted === true
  const paymentFailed      = application.payment_status === 'Failed'

  // Payment only unlocks after documents are submitted
  const paymentReady = parcoursCompleted && documentsSubmitted

  // Progress tracker: Profil → Parcours Scolaire → Documents → Paiement
  const steps: ProgressStep[] = [
    {
      id: 1,
      label: 'Profil',
      state: profileCompleted ? 'completed' : 'current',
    },
    {
      id: 2,
      label: 'Parcours Scolaire',
      state: parcoursCompleted ? 'completed' : profileCompleted ? 'current' : 'pending',
    },
    {
      id: 3,
      label: 'Documents',
      state: documentsSubmitted ? 'completed' : parcoursCompleted ? 'current' : 'pending',
    },
    {
      id: 4,
      label: 'Paiement',
      state: paymentReady ? 'current' : 'pending',
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-slate-800">
            Mon dossier de candidature
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Complétez chaque étape pour finaliser votre inscription au{' '}
            <span className="font-medium text-slate-700">
              UK Level 3 Foundation Diploma
            </span>
            .
          </p>
        </div>

        {/* Reference number — desktop */}
        <div className="hidden shrink-0 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-right sm:block">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Référence
          </p>
          <p className="mt-0.5 font-mono text-sm font-bold text-[#021463]">
            {application.applicant_id}
          </p>
        </div>
      </div>

      {/* ── Payment-failed notice ── */}
      {paymentFailed && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Paiement échoué
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              Votre dernier paiement n'a pas abouti. Rendez-vous sur la page de
              paiement pour réessayer.
            </p>
          </div>
        </div>
      )}

      {/* ── Progress tracker ── */}
      <ProgressTracker steps={steps} />

      {/* ── 4-card action grid (2×2): Profil · Parcours · Documents · Paiement ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* ── Card 1: Profil ── */}
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#021463]/8">
              <User className="h-5 w-5 text-[#021463]" />
            </div>
            <StatusBadge variant="completed" label="Complété" />
          </div>

          <h3 className="font-serif text-base font-semibold text-slate-800">
            Mon Profil
          </h3>
          <p className="mt-1.5 min-h-[36px] text-xs leading-relaxed text-slate-500">
            Informations personnelles et coordonnées.
          </p>

          <Link
            href="/dashboard/profile"
            className="mt-4 flex h-10 w-full items-center justify-center rounded-md
                       border border-slate-200 text-xs font-semibold text-slate-600
                       transition-colors hover:border-[#021463]/20 hover:bg-slate-50
                       hover:text-[#021463]"
          >
            Modifier
          </Link>
        </div>

        {/* ── Card 2: Parcours Scolaire ── */}
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-md ${
                parcoursCompleted ? 'bg-[#10B981]/10' : 'bg-amber-50'
              }`}
            >
              <GraduationCap
                className={`h-5 w-5 ${
                  parcoursCompleted ? 'text-[#10B981]' : 'text-amber-500'
                }`}
              />
            </div>
            {parcoursCompleted ? (
              <StatusBadge variant="completed" label="Complété" />
            ) : (
              <StatusBadge variant="required" label="Action requise" />
            )}
          </div>

          <h3 className="font-serif text-base font-semibold text-slate-800">
            Parcours Scolaire
          </h3>
          <p className="mt-1.5 min-h-[36px] text-xs leading-relaxed text-slate-500">
            Notes académiques et établissement scolaire.
          </p>

          <Link
            href="/dashboard/academic-history"
            className={`mt-4 flex h-10 w-full items-center justify-center rounded-md
                        text-xs font-semibold transition-colors ${
                          parcoursCompleted
                            ? 'border border-slate-200 text-slate-600 hover:border-[#021463]/20 hover:bg-slate-50 hover:text-[#021463]'
                            : 'bg-amber-500 text-white hover:bg-amber-600'
                        }`}
          >
            {parcoursCompleted ? 'Modifier' : 'Compléter le parcours'}
          </Link>
        </div>

        {/* ── Card 3: Documents ── */}
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-md ${
                documentsSubmitted
                  ? 'bg-[#10B981]/10'
                  : parcoursCompleted
                  ? 'bg-[#4EA6F5]/10'
                  : 'bg-slate-50'
              }`}
            >
              {documentsSubmitted ? (
                <FileText className="h-5 w-5 text-[#10B981]" />
              ) : parcoursCompleted ? (
                <FileText className="h-5 w-5 text-[#4EA6F5]" />
              ) : (
                <Lock className="h-5 w-5 text-slate-300" />
              )}
            </div>
            {documentsSubmitted ? (
              <StatusBadge variant="completed" label="Soumis" />
            ) : parcoursCompleted ? (
              <StatusBadge variant="required" label="Action requise" />
            ) : (
              <StatusBadge variant="locked" label="Verrouillé" />
            )}
          </div>

          <h3 className="font-serif text-base font-semibold text-slate-800">
            Documents
          </h3>
          <p className="mt-1.5 min-h-[36px] text-xs leading-relaxed text-slate-500">
            Pièces d'identité et relevés de notes officiels.
          </p>

          {documentsSubmitted ? (
            <Link
              href="/dashboard/documents"
              className="mt-4 flex h-10 w-full items-center justify-center rounded-md
                         border border-slate-200 text-xs font-semibold text-slate-600
                         transition-colors hover:border-[#021463]/20 hover:bg-slate-50
                         hover:text-[#021463]"
            >
              Consulter
            </Link>
          ) : parcoursCompleted ? (
            <Link
              href="/dashboard/documents"
              className="mt-4 flex h-10 w-full items-center justify-center rounded-md
                         bg-[#4EA6F5] text-xs font-semibold text-white
                         transition-colors hover:bg-[#3d96e5]"
            >
              Soumettre les documents
            </Link>
          ) : (
            <button
              disabled
              aria-disabled="true"
              className="mt-4 flex h-10 w-full cursor-not-allowed items-center
                         justify-center rounded-md bg-slate-100 text-xs
                         font-semibold text-slate-400"
            >
              Complétez d'abord le parcours
            </button>
          )}
        </div>

        {/* ── Card 4: Paiement ── */}
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-md ${
                paymentReady ? 'bg-[#021463]/8' : 'bg-slate-50'
              }`}
            >
              {paymentReady ? (
                <CreditCard className="h-5 w-5 text-[#021463]" />
              ) : (
                <Lock className="h-5 w-5 text-slate-300" />
              )}
            </div>
            {paymentReady ? (
              <StatusBadge variant="pending" label="En attente" />
            ) : (
              <StatusBadge variant="locked" label="Verrouillé" />
            )}
          </div>

          <h3 className="font-serif text-base font-semibold text-slate-800">
            Paiement
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            Frais de dossier — non remboursables.
          </p>

          {/* Fee display — amount driven by APPLICATION_FEE_USD */}
          <div className="mt-3 flex items-baseline justify-center gap-1 rounded-md bg-slate-50 py-2.5">
            <span className="font-serif text-2xl font-bold text-[#021463]">{APPLICATION_FEE_USD}</span>
            <span className="text-xs font-bold text-slate-400">USD</span>
          </div>

          {paymentReady ? (
            <Link
              href="/dashboard/payment"
              className="mt-3 flex h-10 w-full items-center justify-center rounded-md
                         bg-[#021463] text-xs font-semibold text-white
                         transition-colors hover:bg-[#031a80]"
            >
              Payer {APPLICATION_FEE_USD} USD
            </Link>
          ) : (
            <button
              disabled
              aria-disabled="true"
              className="mt-3 flex h-10 w-full cursor-not-allowed items-center
                         justify-center rounded-md bg-slate-100 text-xs
                         font-semibold text-slate-400"
            >
              Soumettez d'abord vos documents
            </button>
          )}
        </div>
      </div>

      {/* Reference number — mobile */}
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:hidden">
        <span className="text-xs text-slate-400">Réf. :</span>
        <span className="font-mono text-xs font-bold text-[#021463]">
          {application.applicant_id}
        </span>
      </div>
    </div>
  )
}

// ─── STATE 3 — Submitted / Paid ───────────────────────────────────────────────

function SubmittedState({
  applicant,
  application,
}: {
  applicant: Applicant | null
  application: Application
}) {
  const status       = application.application_status
  const isRejected   = status === 'Dossier refusé'
  const isFinal      = status === 'Admission définitive'
  const isConditional = status === 'Admission sous réserve'

  // Banner theming
  const bannerCls = isRejected
    ? 'border-[#EF4444]/20 bg-[#EF4444]/5'
    : isFinal
    ? 'border-[#10B981]/30 bg-[#10B981]/8'
    : 'border-emerald-200 bg-emerald-50'

  const iconBg = isRejected ? 'bg-[#EF4444]/10' : 'bg-[#10B981]/15'

  const bannerHeading = isRejected
    ? 'Dossier non retenu'
    : isFinal
    ? 'Félicitations — Admission définitive !'
    : 'Dossier Soumis avec Succès'

  const bannerBody = isRejected
    ? "Votre dossier a été examiné et n'a pas été retenu pour cette session d'admission."
    : isFinal
    ? "Votre admission au UK Level 3 Foundation Diploma est officiellement confirmée."
    : isConditional
    ? "Votre dossier est admis sous réserve. L'équipe des admissions vous contactera prochainement."
    : "Votre dossier est en cours d'évaluation par l'équipe des admissions."

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Success banner ── */}
      <div className={`flex items-start gap-4 rounded-lg border p-5 ${bannerCls}`}>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${iconBg}`}
        >
          {isRejected ? (
            <AlertCircle className="h-5 w-5 text-[#EF4444]" />
          ) : (
            <BadgeCheck className="h-5 w-5 text-[#10B981]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-xl font-semibold text-slate-800">
            {bannerHeading}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{bannerBody}</p>
        </div>

        {/* Status pill — desktop */}
        <div className="hidden shrink-0 sm:block">
          <span
            className={`inline-flex items-center rounded border px-2.5 py-1 text-xs font-bold ${
              isRejected
                ? 'border-[#EF4444]/20 bg-[#EF4444]/10 text-[#EF4444]'
                : isFinal
                ? 'border-[#10B981]/25 bg-[#10B981]/10 text-[#10B981]'
                : isConditional
                ? 'border-amber-200 bg-amber-50 text-amber-600'
                : 'border-[#4EA6F5]/20 bg-[#4EA6F5]/10 text-[#4EA6F5]'
            }`}
          >
            {appStatusLabel(status)}
          </span>
        </div>
      </div>

      {/* ── Summary grid — read-only ── */}
      <div>
        <h2 className="mb-4 font-serif text-lg font-semibold text-slate-800">
          Récapitulatif du dossier
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {/* Profil summary */}
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#10B981]/10">
                <User className="h-4 w-4 text-[#10B981]" />
              </div>
              <h3 className="font-serif text-sm font-semibold text-slate-800">
                Profil
              </h3>
            </div>
            <p className="text-sm font-medium text-slate-700">
              {applicant
                ? `${applicant.prenom} ${applicant.nom}`
                : 'Enregistré'}
            </p>
            {applicant && (
              <p className="mt-0.5 truncate text-xs text-slate-400">
                {applicant.email}
              </p>
            )}
            <div className="mt-4 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
              <span className="text-[11px] font-bold text-[#10B981]">Complété</span>
            </div>
          </div>

          {/* Parcours Scolaire summary */}
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#10B981]/10">
                <GraduationCap className="h-4 w-4 text-[#10B981]" />
              </div>
              <h3 className="font-serif text-sm font-semibold text-slate-800">
                Parcours Scolaire
              </h3>
            </div>
            <p className="text-sm font-medium text-slate-700">
              {application.ecole_provenance ?? 'Informations enregistrées'}
            </p>
            {application.option_academique && (
              <p className="mt-0.5 text-xs text-slate-400">
                {application.option_academique}
              </p>
            )}
            <div className="mt-4 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
              <span className="text-[11px] font-bold text-[#10B981]">Enregistré</span>
            </div>
          </div>

          {/* Paiement summary — amount driven by APPLICATION_FEE_USD */}
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#10B981]/10">
                <CreditCard className="h-4 w-4 text-[#10B981]" />
              </div>
              <h3 className="font-serif text-sm font-semibold text-slate-800">
                Paiement
              </h3>
            </div>
            <p className="text-sm font-medium text-slate-700">
              {APPLICATION_FEE_USD} USD{' '}
              <span className="font-normal text-slate-400">— Frais de dossier</span>
            </p>
            {application.payment_confirmed_at && (
              <p className="mt-0.5 text-xs text-slate-400">
                Confirmé le{' '}
                {new Date(application.payment_confirmed_at).toLocaleDateString(
                  'fr-FR',
                  { day: 'numeric', month: 'long', year: 'numeric' },
                )}
              </p>
            )}
            <div className="mt-4 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
              <span className="text-[11px] font-bold text-[#10B981]">
                {APPLICATION_FEE_USD} USD Confirmé
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ── Documents link (if conditional or under review) ── */}
      {!isRejected && !isFinal && (
        <Link
          href="/dashboard/documents"
          className="flex items-center justify-between rounded-lg border border-[#4EA6F5]/20
                     bg-[#4EA6F5]/5 px-5 py-4 transition-colors
                     hover:border-[#4EA6F5]/40 hover:bg-[#4EA6F5]/10"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-[#4EA6F5]" />
            <div>
              <p className="text-sm font-semibold text-slate-700">Documents justificatifs</p>
              <p className="text-xs text-slate-500">
                {isConditional
                  ? "Des documents complémentaires vous ont été demandés."
                  : "Consultez vos pièces justificatives téléversées."}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#4EA6F5]" />
        </Link>
      )}

      {/* ── Official reference ── */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Numéro de dossier officiel
          </p>
          <p className="mt-0.5 font-mono text-base font-bold text-[#021463]">
            {application.applicant_id}
          </p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-xs text-slate-400">Promotion {application.intake_year}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            UK Level 3 Foundation Diploma
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { applicant, application, loading, error, refetch } = useApplication()

  // Loading skeleton
  if (loading) {
    return <DashboardSkeleton />
  }

  // Error
  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex max-w-sm items-start gap-3 rounded-lg border border-[#EF4444]/20 bg-[#EF4444]/5 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#EF4444]" />
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Erreur de chargement
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // STATE 3 — Submitted / Paid
  if (application && isPaid(application.payment_status)) {
    return <SubmittedState applicant={applicant} application={application} />
  }

  // STATE 2 — In-Progress
  if (application) {
    return <InProgressState applicant={applicant} application={application} />
  }

  // STATE 1 — Empty
  return <EmptyState applicant={applicant} refetch={refetch} />
}
