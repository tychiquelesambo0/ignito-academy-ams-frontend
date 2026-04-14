'use client'

/**
 * Bourse d'Excellence — /dashboard/scholarship
 *
 * Conditional access based on payment status and scholarship eligibility.
 *
 * State machine:
 *  1. LOADING         — context not yet resolved
 *  2. PAYMENT_PENDING — payment not confirmed → lock screen, CTA to /dashboard/payment
 *  3. NOT_ELIGIBLE    — payment confirmed, is_scholarship_eligible = false
 *  4. FORM            — eligible, no video URL yet (or applicant wants to update)
 *  5. SUBMITTED       — video URL saved, awaiting review
 *  6. AWARDED         — scholarship granted
 *  7. REJECTED        — not awarded this cycle
 *
 * Architecture pillar: NO video file uploads.
 * Only YouTube / Vimeo URLs accepted. Never build <input type="file" accept="video/*">.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Award,
  Lock,
  XCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  AlertCircle,
  Play,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { useApplication } from '@/lib/context/ApplicationContext'
import BackButton from '@/components/dashboard/BackButton'

// ─── Video URL helpers ─────────────────────────────────────────────────────────

/** Converts any YouTube / Vimeo URL to an embeddable src string, or null. */
function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url.trim())

    // YouTube: youtube.com/watch?v=ID  |  youtu.be/ID  |  youtube.com/embed/ID
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let videoId: string | null = null

      if (u.hostname.includes('youtu.be')) {
        videoId = u.pathname.slice(1)
      } else if (u.pathname.includes('/embed/')) {
        videoId = u.pathname.split('/embed/')[1]
      } else {
        videoId = u.searchParams.get('v')
      }

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?rel=0`
      }
    }

    // Vimeo: vimeo.com/ID  |  vimeo.com/channels/.../ID  |  player.vimeo.com/video/ID
    if (u.hostname.includes('vimeo.com')) {
      const segments = u.pathname.split('/').filter(Boolean)
      // last numeric segment is the video ID
      const videoId = [...segments].reverse().find((s) => /^\d+$/.test(s))
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}`
      }
    }

    return null
  } catch {
    return null
  }
}

function isValidVideoUrl(url: string): boolean {
  return toEmbedUrl(url) !== null
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function PaymentPendingView() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100">
        <Lock className="h-8 w-8 text-slate-400" />
      </div>
      <h2 className="font-serif text-2xl font-semibold text-slate-800">
        Étape verrouillée
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
        Finalisez votre paiement des frais de dossier pour débloquer la
        candidature à la Bourse d'Excellence.
      </p>
      <Link
        href="/dashboard/payment"
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-[#031463]
                   px-6 text-sm font-semibold text-white transition-colors hover:bg-[#031463]/90"
      >
        Aller au paiement
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

function NotEligibleView() {
  return (
    <div className="rounded-lg bg-white p-8 shadow-sm">
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100">
          <XCircle className="h-7 w-7 text-slate-400" />
        </div>
        <h2 className="font-serif text-xl font-semibold text-slate-800">
          Bourse d'Excellence — Non éligible
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
          Votre dossier académique ne satisfait pas les critères d'éligibilité
          de la Bourse d'Excellence pour la promotion 2026.
        </p>
      </div>

      <div className="mt-8 rounded-md border border-slate-100 bg-slate-50 p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Critères d'éligibilité
        </p>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-4 w-4 shrink-0 text-slate-300">•</span>
            Moyenne générale ≥ 70 % en Terminale (Grade 12)
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-4 w-4 shrink-0 text-slate-300">•</span>
            Résultats EXETAT ≥ 70 %
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-4 w-4 shrink-0 text-slate-300">•</span>
            Dossier de candidature complet et paiement confirmé
          </li>
        </ul>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Si vous pensez qu'il y a une erreur, contactez notre équipe à{' '}
        <a
          href="mailto:admissions@ignitoacademy.com"
          className="text-[#4EA6F5] hover:underline"
        >
          admissions@ignitoacademy.com
        </a>
        .
      </p>
    </div>
  )
}

// ─── Submitted (locked) view ──────────────────────────────────────────────────
// Once the video URL is saved the dossier is sealed — no further editing.

function SubmittedView({ videoUrl }: { videoUrl: string }) {
  const embedUrl = toEmbedUrl(videoUrl)

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Lock banner */}
      <div className="flex items-start gap-3.5 rounded-lg border border-[#10B981]/25
                      bg-[#10B981]/8 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center
                        rounded-md bg-[#10B981]/15">
          <ShieldCheck className="h-4.5 w-4.5 text-[#10B981]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">
            Candidature soumise — en cours d'évaluation
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            Votre vidéo de présentation a été reçue. Notre jury l'évaluera
            prochainement. Vous serez notifié par email dès qu'une décision
            sera rendue. Aucune modification n'est possible à ce stade.
          </p>
        </div>
      </div>

      {/* Video preview — read-only */}
      {embedUrl ? (
        <div className="overflow-hidden rounded-lg shadow-sm">
          <div className="aspect-video w-full">
            <iframe
              src={embedUrl}
              className="h-full w-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-slate-200
                        bg-slate-50 py-12">
          <p className="text-sm text-slate-400">Aperçu indisponible</p>
        </div>
      )}

      {/* External link + lock indicator */}
      <div className="flex items-center justify-between">
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400
                     transition-colors hover:text-[#4EA6F5]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ouvrir dans un nouvel onglet
        </a>
        <span className="inline-flex items-center gap-1.5 rounded border
                         border-slate-200 bg-slate-50 px-2.5 py-1
                         text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          <Lock className="h-3 w-3" />
          Verrouillé
        </span>
      </div>
    </div>
  )
}

function AwardedView({ videoUrl }: { videoUrl: string }) {
  const embedUrl = toEmbedUrl(videoUrl)
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 rounded-lg border border-[#10B981]/30
                      bg-[#10B981]/8 px-5 py-4">
        <Award className="mt-0.5 h-6 w-6 shrink-0 text-[#10B981]" />
        <div>
          <p className="font-semibold text-[#10B981]">Bourse d'Excellence accordée !</p>
          <p className="mt-0.5 text-sm text-slate-600">
            Félicitations — votre candidature a été retenue par le jury d'Ignito Academy.
          </p>
        </div>
      </div>
      {embedUrl && (
        <div className="overflow-hidden rounded-lg shadow-sm">
          <div className="aspect-video w-full">
            <iframe
              src={embedUrl}
              className="h-full w-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function RejectedView() {
  return (
    <div className="rounded-lg bg-white p-8 shadow-sm text-center space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100">
        <XCircle className="h-7 w-7 text-slate-400" />
      </div>
      <h2 className="font-serif text-xl font-semibold text-slate-800">
        Candidature non retenue
      </h2>
      <p className="mx-auto max-w-sm text-sm leading-relaxed text-slate-500">
        Nous vous remercions pour votre candidature à la Bourse d'Excellence.
        Malheureusement, votre dossier n'a pas été retenu pour cette promotion.
        Votre admission au UK Level 3 Foundation Diploma reste confirmée.
      </p>
      <p className="text-xs text-slate-400">
        Pour toute question :{' '}
        <a
          href="mailto:admissions@ignitoacademy.com"
          className="text-[#4EA6F5] hover:underline"
        >
          admissions@ignitoacademy.com
        </a>
      </p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ScholarshipPage() {
  const { application, refetch } = useApplication()

  const [videoUrl, setVideoUrl]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)
  // Local submitted flag — set immediately after a successful DB write so the
  // success view appears without waiting for context refetch propagation.
  const [justSubmitted, setJustSubmitted] = useState(false)
  const [submittedUrl, setSubmittedUrl]   = useState<string | null>(null)

  // Pre-fill input from any previously saved (but not yet locked) value
  useEffect(() => {
    if (application?.scholarship_video_url) {
      setVideoUrl(application.scholarship_video_url)
    }
  }, [application?.scholarship_video_url])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!application) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#4EA6F5]" />
      </div>
    )
  }

  // ── State machine ─────────────────────────────────────────────────────────

  const paymentConfirmed =
    application.payment_status === 'Confirmed' ||
    application.payment_status === 'Waived'

  if (!paymentConfirmed) return (
    <div className="space-y-8"><PageHeader /><PaymentPendingView /></div>
  )

  if (!application.is_scholarship_eligible) return (
    <div className="space-y-8"><PageHeader /><NotEligibleView /></div>
  )

  // Awarded / Rejected are admin-set terminal states
  if (application.scholarship_status === 'Awarded') return (
    <div className="space-y-8">
      <PageHeader />
      <AwardedView videoUrl={application.scholarship_video_url ?? ''} />
    </div>
  )

  if (application.scholarship_status === 'Rejected') return (
    <div className="space-y-8"><PageHeader /><RejectedView /></div>
  )

  // ── SUBMITTED — video saved → locked, no editing ──────────────────────────
  // Priority: local justSubmitted flag (immediate) OR DB value (on reload).
  const savedVideoUrl = justSubmitted ? submittedUrl : application.scholarship_video_url

  if (savedVideoUrl) return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader />

      {/* Eligibility badge */}
      <div className="flex items-center gap-2 rounded-md border border-[#10B981]/25
                      bg-[#10B981]/8 px-4 py-2.5 w-fit">
        <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
        <span className="text-sm font-medium text-[#10B981]">
          Éligible à la Bourse d&apos;Excellence 2026
        </span>
      </div>

      <SubmittedView videoUrl={savedVideoUrl} />

      {/* Dashboard CTA — always visible after submission */}
      <div className="flex justify-center pt-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 h-11 px-6 rounded-md
                     bg-[#031463] text-sm font-semibold text-white
                     transition-colors hover:bg-[#031463]/90"
        >
          Retour au tableau de bord
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )

  // ── FORM — eligible, no video submitted yet ────────────────────────────────

  const embedUrl    = toEmbedUrl(videoUrl)
  const urlIsValid  = isValidVideoUrl(videoUrl)
  const showPreview = urlIsValid && !!embedUrl

  const handleSave = async () => {
    if (!urlIsValid) {
      setSaveError('Veuillez entrer une URL YouTube ou Vimeo valide.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session expirée. Veuillez vous reconnecter.')

      // Filter by user_id to match the RLS policy (same pattern as all other forms).
      const { data: saved, error } = await supabase
        .from('applications')
        .update({ scholarship_video_url: videoUrl.trim() })
        .eq('user_id', user.id)
        .select('scholarship_video_url')
        .maybeSingle()

      if (error) throw new Error(error.message)
      if (!saved) throw new Error('La mise à jour n\'a pas été enregistrée. Vérifiez votre session et réessayez.')

      // Flip the local flag immediately — the UI transitions to SubmittedView
      // without waiting for context propagation.
      setSubmittedUrl(saved.scholarship_video_url ?? videoUrl.trim())
      setJustSubmitted(true)

      // Fire scholarship video confirmation email (fire-and-forget)
      if (application?.applicant_id) {
        fetch('/api/scholarship/notify-submitted', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicantId: application.applicant_id,
            videoUrl: saved.scholarship_video_url ?? videoUrl.trim(),
          }),
        }).catch(() => {
          // Non-blocking — UI success is not dependent on email delivery
        })
      }

      // Refresh context in the background so realtime + sidebar stay in sync.
      refetch()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader />

      {/* Eligibility badge */}
      <div className="flex items-center gap-2 rounded-md border border-[#10B981]/25
                      bg-[#10B981]/8 px-4 py-2.5 w-fit">
        <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
        <span className="text-sm font-medium text-[#10B981]">
          Éligible à la Bourse d&apos;Excellence 2026
        </span>
      </div>

      {/* Instructions card */}
      <div className="rounded-lg bg-white p-6 shadow-sm space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center
                          rounded-md bg-[#031463]/8">
            <Award className="h-5 w-5 text-[#031463]" />
          </div>
          <div>
            <h2 className="font-serif text-base font-semibold text-slate-800">
              Soumettre votre candidature
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Enregistrez une vidéo de présentation (2 à 5 minutes) dans laquelle
              vous expliquez votre motivation, vos ambitions académiques et pourquoi
              vous méritez la Bourse d&apos;Excellence d&apos;Ignito Academy.
              Publiez-la sur YouTube ou Vimeo et collez le lien ci-dessous.
            </p>
          </div>
        </div>
        <ul className="mt-1 ml-12 space-y-1 text-xs text-slate-500">
          {[
            'Durée : 2 à 5 minutes',
            'Langue : français ou anglais',
            'Plateformes acceptées : YouTube · Vimeo',
          ].map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-[#4EA6F5]" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* URL input */}
      <div className="rounded-lg bg-white p-6 shadow-sm space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="video-url" className="block text-sm font-medium text-slate-700">
            Lien de votre vidéo <span className="text-[#EF4444]">*</span>
          </label>
          <div className="relative">
            <Play className="pointer-events-none absolute left-3 top-1/2 h-4 w-4
                             -translate-y-1/2 text-slate-400" />
            <input
              id="video-url"
              type="url"
              value={videoUrl}
              onChange={(e) => { setVideoUrl(e.target.value); setSaveError(null) }}
              placeholder="https://www.youtube.com/watch?v=… ou https://vimeo.com/…"
              className="h-12 w-full rounded-md border border-slate-200 bg-white
                         pl-10 pr-4 text-sm text-slate-800 outline-none
                         focus:border-[#4EA6F5] focus:ring-2 focus:ring-[#4EA6F5]/20
                         placeholder:text-slate-400"
            />
          </div>
          <p className="text-xs text-slate-400">
            Collez l&apos;URL complète de votre vidéo YouTube ou Vimeo.
          </p>
        </div>

        {/* Live preview */}
        {showPreview && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[#10B981]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Aperçu de votre vidéo
            </p>
            <div className="overflow-hidden rounded-lg shadow-sm">
              <div className="aspect-video w-full">
                <iframe
                  src={embedUrl!}
                  className="h-full w-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </div>
          </div>
        )}

        {/* Invalid URL warning */}
        {videoUrl && !urlIsValid && (
          <div className="flex items-center gap-2 text-xs text-amber-600">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            URL non reconnue — assurez-vous d&apos;utiliser un lien YouTube ou Vimeo valide.
          </div>
        )}

        {/* Error */}
        {saveError && (
          <div className="flex items-start gap-2 rounded-md border border-[#EF4444]/20
                          bg-[#EF4444]/5 px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
            <p className="text-sm text-[#EF4444]">{saveError}</p>
          </div>
        )}

        {/* Warning: submission is final */}
        <div className="flex items-start gap-2 rounded-md border border-amber-200
                        bg-amber-50 px-3.5 py-3">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          <p className="text-xs text-amber-700 leading-relaxed">
            <span className="font-semibold">Attention :</span> une fois soumise, votre
            candidature est définitive et ne peut plus être modifiée.
            Vérifiez bien votre lien avant de confirmer.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !urlIsValid}
          className="h-12 w-full rounded-md bg-[#031463] text-sm font-semibold
                     text-white transition-colors hover:bg-[#031463]/90
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Envoi en cours…
            </span>
          ) : (
            'Soumettre ma candidature'
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Shared page header ───────────────────────────────────────────────────────

function PageHeader() {
  return (
    <div>
      <BackButton href="/dashboard/payment" label="Paiement" />
      <div className="mt-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center
                        rounded-lg bg-[#031463]/8">
          <Award className="h-5 w-5 text-[#031463]" />
        </div>
        <div>
          <h1 className="font-serif text-3xl font-semibold text-slate-800">
            Bourse d'Excellence
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Programme de bourses — Promotion 2026
          </p>
        </div>
      </div>
    </div>
  )
}
