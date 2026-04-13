'use client'

/**
 * Paiement — /dashboard/payment
 *
 * Collects the 29 USD admission fee via PawaPay mobile money.
 * Supported networks: M-Pesa (Vodacom), Orange Money, Airtel Money.
 *
 * Screen states:
 *  idle        → Provider radio + phone input + submit CTA
 *  processing  → Spinner overlay (API call in flight)
 *  awaiting    → USSD confirmation screen + live polling (PawaPay mode)
 *  confirmed   → Success card (immediate or polling)
 *  already_paid → Read-only summary (payment_status = Confirmed / Waived)
 *
 * Gate   : StepGate stepId="payment" (requires documents_submitted = true)
 * Amount : 29 USD — hardcoded, no CDF (architectural pillar)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  Loader2,
  CreditCard,
  Phone,
  ShieldCheck,
  AlertCircle,
  Clock,
  Smartphone,
  ChevronRight,
  Info,
} from 'lucide-react'
import { useApplication } from '@/lib/context/ApplicationContext'
import type { Application, Applicant } from '@/lib/context/ApplicationContext'
import { useApplicationSteps } from '@/lib/hooks/useApplicationSteps'
import StepGate from '@/components/dashboard/StepGate'
import BackButton from '@/components/dashboard/BackButton'

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMISSION_FEE_USD = 1 // TEMP: restore to 29 before launch

type ProviderOption = 'M-Pesa' | 'Orange Money' | 'Airtel Money'
type PaymentScreenState = 'idle' | 'processing' | 'awaiting' | 'confirmed' | 'failed'
const POLL_INTERVAL_MS = 3_000
const AWAIT_TIMEOUT_S  = 300 // 5 minutes

interface ProviderDef {
  id: ProviderOption
  name: string
  network: string
  prefixes: string
  ringClass: string   // tailwind ring on selected card
  dotClass: string    // coloured dot
  selectedBg: string  // subtle tint when selected
}

const PROVIDERS: ProviderDef[] = [
  {
    id: 'M-Pesa',
    name: 'M-Pesa',
    network: 'Vodacom DRC',
    prefixes: '081 · 082 · 083 · 084 · 085',
    ringClass: 'ring-2 ring-emerald-400',
    dotClass: 'bg-emerald-500',
    selectedBg: 'bg-emerald-50 border-emerald-300',
  },
  {
    id: 'Orange Money',
    name: 'Orange Money',
    network: 'Orange DRC',
    prefixes: '080 · 089 · 090',
    ringClass: 'ring-2 ring-orange-400',
    dotClass: 'bg-orange-500',
    selectedBg: 'bg-orange-50 border-orange-300',
  },
  {
    id: 'Airtel Money',
    name: 'Airtel Money',
    network: 'Airtel DRC',
    prefixes: '097 · 098 · 099',
    ringClass: 'ring-2 ring-rose-400',
    dotClass: 'bg-rose-500',
    selectedBg: 'bg-rose-50 border-rose-300',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectProvider(phone: string): ProviderOption {
  const digits = phone.replace(/^\+243/, '').replace(/\D/g, '')
  if (/^8[12345]/.test(digits)) return 'M-Pesa'
  if (/^(80|89|90)/.test(digits)) return 'Orange Money'
  if (/^9/.test(digits)) return 'Airtel Money'
  return 'M-Pesa'
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function AlreadyPaidView({ application }: { application: Application }) {
  const isWaived = application.payment_status === 'Waived'

  return (
    <div className="rounded-lg bg-white border border-emerald-200 px-8 py-10 text-center space-y-5">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>

      <div>
        <h2 className="font-serif text-2xl font-semibold text-slate-800">
          {isWaived ? 'Frais dispensés' : 'Paiement confirmé'}
        </h2>
        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
          {isWaived
            ? "Les frais de dossier ont été dispensés par l'administration."
            : `Votre paiement de ${ADMISSION_FEE_USD} USD a été reçu et enregistré avec succès.`}
        </p>
      </div>

      {application.transaction_id && (
        <div className="inline-block bg-slate-50 rounded-md px-4 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">
            Référence de transaction
          </p>
          <p className="text-sm font-mono text-slate-600">{application.transaction_id}</p>
        </div>
      )}

      {application.payment_confirmed_at && (
        <p className="text-xs text-slate-400">
          Confirmé le{' '}
          {new Date(application.payment_confirmed_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}

      <div className="pt-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#031463] hover:underline"
        >
          Retour au tableau de bord
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

function ConfirmedView({
  transactionId,
  onGoToDashboard,
}: {
  transactionId: string | null
  onGoToDashboard: () => void
}) {
  return (
    <div className="rounded-lg bg-white border border-emerald-200 px-8 py-10 text-center space-y-5">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>

      <div>
        <h2 className="font-serif text-2xl font-semibold text-slate-800">
          Paiement confirmé !
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
          Votre paiement de{' '}
          <span className="font-semibold text-slate-800">{ADMISSION_FEE_USD} USD</span>{' '}
          a été enregistré avec succès. Un email de confirmation vous a été envoyé.
        </p>
      </div>

      {transactionId && (
        <div className="inline-block bg-slate-50 rounded-md px-4 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">
            Référence de transaction
          </p>
          <p className="text-sm font-mono text-slate-700">{transactionId}</p>
        </div>
      )}

      <div className="pt-2 flex flex-col items-center gap-3">
        <button
          onClick={onGoToDashboard}
          className="inline-flex items-center gap-2 h-12 px-7 rounded-lg bg-[#031463] text-white text-sm font-medium hover:bg-[#031463]/90 transition-colors"
        >
          Retour au tableau de bord
        </button>
        <p className="text-xs text-slate-400">
          Votre dossier est maintenant en cours d'évaluation.
        </p>
      </div>
    </div>
  )
}

function AwaitingView({
  phone,
  provider,
  seconds,
  onCancel,
}: {
  phone: string
  provider: ProviderOption
  seconds: number
  onCancel: () => void
}) {
  const progressPct = Math.max(0, (seconds / AWAIT_TIMEOUT_S) * 100)

  return (
    <div className="rounded-lg bg-white border border-[#4EA6F5]/25 px-8 py-10 text-center space-y-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#4EA6F5]/10">
        <Smartphone className="h-8 w-8 text-[#4EA6F5] animate-pulse" />
      </div>

      <div>
        <h2 className="font-serif text-xl font-semibold text-slate-800">
          Vérifiez votre téléphone
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          Un message USSD a été envoyé au{' '}
          <span className="font-mono font-medium text-slate-800">{phone}</span>
          {' '}via <span className="font-medium">{provider}</span>.{' '}
          Répondez au message pour approuver le paiement.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 text-[#4EA6F5]">
          <Clock className="h-4 w-4" />
          <span className="font-mono text-lg font-semibold">{formatCountdown(seconds)}</span>
          <span className="text-xs text-slate-400">restantes</span>
        </div>
        <div className="w-full max-w-xs mx-auto bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-[#4EA6F5] rounded-full transition-all duration-1000"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="bg-slate-50 rounded-md px-4 py-3 text-xs text-slate-500 text-left space-y-1 max-w-sm mx-auto">
        <p className="flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
          Ne fermez pas cette page pendant le traitement du paiement.
        </p>
        <p className="flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
          La confirmation peut prendre jusqu'à quelques minutes selon votre réseau.
        </p>
      </div>

      <button
        onClick={onCancel}
        className="text-sm text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
      >
        Annuler et réessayer
      </button>
    </div>
  )
}

// ─── Fee Invoice ──────────────────────────────────────────────────────────────

function FeeInvoice({ application }: { application: Application }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden h-fit">
      {/* Header */}
      <div className="bg-[#031463] px-5 py-4">
        <p className="text-[10px] uppercase tracking-widest text-white/50 font-medium">
          Récapitulatif
        </p>
        <h3 className="font-serif text-lg font-semibold text-white mt-0.5">
          Frais de dossier
        </h3>
      </div>

      {/* Line items */}
      <div className="px-5 py-5 space-y-3.5">
        <div className="flex justify-between items-start gap-4 text-sm">
          <span className="text-slate-400 shrink-0">Programme</span>
          <span className="text-slate-700 font-medium text-right text-xs leading-relaxed">
            UK Level 3 Foundation Diploma
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Année</span>
          <span className="text-slate-700 font-medium">{application.intake_year}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Référence</span>
          <span className="font-mono text-xs text-slate-600">{application.applicant_id}</span>
        </div>

        <div className="border-t border-slate-100 pt-3.5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Frais de dossier</span>
            <span className="text-slate-700">{ADMISSION_FEE_USD}.00 USD</span>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-3.5">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-800">Total à régler</span>
            <span className="text-xl font-bold text-[#031463]">{ADMISSION_FEE_USD} USD</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        <p className="text-[11px] text-slate-400">
          Paiement sécurisé via PawaPay · Crypté TLS
        </p>
      </div>
    </div>
  )
}

// ─── Provider Card ────────────────────────────────────────────────────────────

function ProviderCard({
  provider,
  selected,
  onSelect,
}: {
  provider: ProviderDef
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'w-full text-left rounded-lg border px-4 py-3.5 transition-all duration-150',
        selected
          ? `${provider.selectedBg} ${provider.ringClass}`
          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        {/* Radio indicator */}
        <div
          className={[
            'h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
            selected ? 'border-current' : 'border-slate-300',
          ].join(' ')}
          style={selected ? { borderColor: 'currentColor' } : {}}
        >
          {selected && (
            <div className={`h-2 w-2 rounded-full ${provider.dotClass}`} />
          )}
        </div>

        {/* Network dot */}
        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${provider.dotClass}`} />

        {/* Labels */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{provider.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{provider.network} · {provider.prefixes}</p>
        </div>
      </div>
    </button>
  )
}

// ─── Payment Form ─────────────────────────────────────────────────────────────

function PaymentForm() {
  const { applicant, application, refetch } = useApplication()
  const steps = useApplicationSteps()
  const router = useRouter()

  const [screenState, setScreenState] = useState<PaymentScreenState>('idle')
  const [selectedProvider, setSelectedProvider] = useState<ProviderOption>('M-Pesa')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [awaitingSeconds, setAwaitingSeconds] = useState(AWAIT_TIMEOUT_S)

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollStartRef    = useRef<number>(0)

  // ── Pre-fill phone from profile ──────────────────────────────────────────
  useEffect(() => {
    if (applicant?.phone_number) {
      setPhoneNumber(applicant.phone_number)
      setSelectedProvider(detectProvider(applicant.phone_number))
    }
  }, [applicant?.phone_number])

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  // ── Polling — used in PawaPay live mode ──────────────────────────────────
  const startPolling = useCallback(
    (applicantId: string) => {
      pollStartRef.current = Date.now()

      pollIntervalRef.current = setInterval(async () => {
        const elapsed = Date.now() - pollStartRef.current
        const remaining = Math.max(0, AWAIT_TIMEOUT_S - Math.floor(elapsed / 1000))
        setAwaitingSeconds(remaining)

        // Timeout
        if (elapsed >= AWAIT_TIMEOUT_S * 1000) {
          clearInterval(pollIntervalRef.current!)
          setScreenState('failed')
          setErrorMsg(
            "Le délai de confirmation a expiré (5 minutes). Veuillez réessayer ou contacter le support.",
          )
          return
        }

        try {
          const res  = await fetch(`/api/payment/status/${applicantId}`)
          const data = await res.json()

          if (data.paymentStatus === 'Confirmed' || data.paymentStatus === 'Waived') {
            clearInterval(pollIntervalRef.current!)
            setScreenState('confirmed')
            await refetch()
          } else if (data.paymentStatus === 'Failed') {
            clearInterval(pollIntervalRef.current!)
            setScreenState('failed')
            setErrorMsg('Le paiement a échoué. Veuillez vérifier votre solde et réessayer.')
          }
        } catch {
          // Network hiccup — keep polling silently
        }
      }, POLL_INTERVAL_MS)
    },
    [refetch],
  )

  // ── Submit handler ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!application?.applicant_id) return
    if (!phoneNumber.trim()) {
      setErrorMsg('Veuillez entrer votre numéro de téléphone mobile money.')
      return
    }

    setErrorMsg(null)
    setScreenState('processing')

    try {
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicantId: application.applicant_id,
          provider:    selectedProvider,
          phoneNumber: phoneNumber.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setScreenState('failed')
        setErrorMsg(data.error || "Une erreur inattendue s'est produite.")
        return
      }

      setTransactionId(data.transactionId ?? null)

      if (data.status === 'Confirmed') {
        // Mock mode — immediate confirmation
        setScreenState('confirmed')
        await refetch()
      } else {
        // PawaPay live mode — show USSD waiting screen and poll
        setAwaitingSeconds(AWAIT_TIMEOUT_S)
        setScreenState('awaiting')
        startPolling(application.applicant_id)
      }
    } catch {
      setScreenState('failed')
      setErrorMsg('Erreur de connexion. Vérifiez votre réseau et réessayez.')
    }
  }

  const handleRetry = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    setScreenState('idle')
    setErrorMsg(null)
    setAwaitingSeconds(AWAIT_TIMEOUT_S)
  }

  // ── Guard: already paid ──────────────────────────────────────────────────
  if (!application) return null

  const isAlreadyPaid =
    application.payment_status === 'Confirmed' ||
    application.payment_status === 'Waived'

  if (isAlreadyPaid) {
    return (
      <div className="space-y-8">
        <header>
          <BackButton href="/dashboard/documents" label="Documents" />
          <h1 className="font-serif text-3xl font-semibold text-slate-800 mt-4">
            Paiement du dossier
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Frais d'inscription — {ADMISSION_FEE_USD} USD
          </p>
        </header>
        <AlreadyPaidView application={application} />
      </div>
    )
  }

  // ── Confirmed (just paid this session) ───────────────────────────────────
  if (screenState === 'confirmed') {
    return (
      <div className="space-y-8">
        <header>
          <BackButton href="/dashboard/documents" label="Documents" />
          <h1 className="font-serif text-3xl font-semibold text-slate-800 mt-4">
            Paiement du dossier
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Frais d'inscription — {ADMISSION_FEE_USD} USD
          </p>
        </header>
        <ConfirmedView
          transactionId={transactionId}
          onGoToDashboard={() => router.push('/dashboard')}
        />
      </div>
    )
  }

  // ── Awaiting USSD confirmation ────────────────────────────────────────────
  if (screenState === 'awaiting') {
    return (
      <div className="space-y-8">
        <header>
          <BackButton href="/dashboard/documents" label="Documents" />
          <h1 className="font-serif text-3xl font-semibold text-slate-800 mt-4">
            Paiement du dossier
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Frais d'inscription — {ADMISSION_FEE_USD} USD
          </p>
        </header>
        <AwaitingView
          phone={phoneNumber}
          provider={selectedProvider}
          seconds={awaitingSeconds}
          onCancel={handleRetry}
        />
      </div>
    )
  }

  // ── Main form (idle or failed) ───────────────────────────────────────────
  const isProcessing = screenState === 'processing'

  return (
    <div className="space-y-8">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <header>
        <BackButton href="/dashboard/documents" label="Documents" />
        <h1 className="font-serif text-3xl font-semibold text-slate-800 mt-4">
          Paiement du dossier
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Réglez les frais d'inscription pour finaliser votre dossier de candidature.
        </p>
      </header>

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {errorMsg && (
        <div className="flex items-start gap-3 rounded-lg border border-[#EF4444]/20 bg-[#EF4444]/5 px-4 py-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
          <div>
            <p className="text-sm font-medium text-[#EF4444]">Erreur de paiement</p>
            <p className="text-sm text-slate-600 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-7 items-start">

        {/* ── Left: Fee invoice ──────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <FeeInvoice application={application} />
        </div>

        {/* ── Right: Payment form ───────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-6">

          {/* Provider selection */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <h2 className="font-serif text-base font-semibold text-slate-800 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-400" />
                Sélectionnez votre réseau
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Choisissez le réseau correspondant à votre numéro mobile money.
              </p>
            </div>

            <div className="space-y-2.5">
              {PROVIDERS.map((p) => (
                <ProviderCard
                  key={p.id}
                  provider={p}
                  selected={selectedProvider === p.id}
                  onSelect={() => !isProcessing && setSelectedProvider(p.id)}
                />
              ))}
            </div>
          </div>

          {/* Phone number */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
            <div>
              <h2 className="font-serif text-base font-semibold text-slate-800 flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                Numéro mobile money
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Le paiement sera initié sur ce numéro. Assurez-vous qu'il est actif.
              </p>
            </div>

            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isProcessing}
              placeholder="+243 8XX XXX XXX"
              className={[
                'w-full h-12 rounded-lg border px-3.5 text-sm font-mono text-slate-800',
                'placeholder:text-slate-300 placeholder:font-sans',
                'focus:outline-none focus:ring-2 focus:ring-[#4EA6F5]/50 focus:border-[#4EA6F5]',
                'disabled:bg-slate-50 disabled:cursor-not-allowed',
                'transition-colors border-slate-300',
              ].join(' ')}
            />

            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              Votre numéro est transmis de manière chiffrée et n'est jamais partagé.
            </p>
          </div>

          {/* PawaPay info notice */}
          <div className="flex items-start gap-2.5 rounded-md border border-[#4EA6F5]/20 bg-[#4EA6F5]/5 px-3.5 py-3">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4EA6F5]" />
            <p className="text-xs leading-relaxed text-slate-600">
              Après avoir cliqué sur &laquo;&nbsp;Payer&nbsp;&raquo;, vous recevrez un{' '}
              <span className="font-medium">message USSD</span> sur votre téléphone.
              Approuvez-le pour finaliser votre paiement.
            </p>
          </div>

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing}
            className={[
              'w-full h-12 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2',
              isProcessing
                ? 'bg-[#031463]/60 text-white cursor-not-allowed'
                : 'bg-[#031463] text-white hover:bg-[#031463]/90 active:scale-[0.99]',
            ].join(' ')}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Traitement en cours…
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Payer {ADMISSION_FEE_USD} USD
              </>
            )}
          </button>

          {/* Terms note */}
          <p className="text-center text-[11px] text-slate-400 leading-relaxed">
            En procédant au paiement, vous acceptez les{' '}
            <span className="underline underline-offset-2 cursor-pointer">
              conditions d'admission
            </span>{' '}
            d'Ignito Academy. Les frais de dossier ne sont pas remboursables.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Default export ────────────────────────────────────────────────────────────

export default function PaymentPage() {
  return (
    <StepGate stepId="payment">
      <PaymentForm />
    </StepGate>
  )
}
