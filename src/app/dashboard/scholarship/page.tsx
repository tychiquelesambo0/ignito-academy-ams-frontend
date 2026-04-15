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
    <div className="rounded-lg bg-white p-8 shadow-sm space-y-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100">
          <XCircle className="h-7 w-7 text-slate-400" />
        </div>
        <h2 className="font-serif text-2xl font-semibold text-[#021463]">
          Profil Non Éligible à la Bourse
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
          Après une analyse rigoureuse de vos données académiques, le comité vous informe que
          votre profil ne répond pas à l&apos;intégralité des critères stricts exigés pour la
          Bourse d&apos;Excellence de cette session.
        </p>
      </div>

      <div className="rounded-md border border-slate-100 bg-slate-50 p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Conditions Préalables d&apos;Examen
        </p>
        <ul className="space-y-2.5 text-sm text-slate-600">
          <li className="flex items-start gap-2.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4EA6F5]" />
            <span>
              <strong className="font-semibold text-slate-700">Excellence Académique :</strong>{' '}
              Moyenne générale minimale de 70% exigée pour les classes de 10ème, 11ème, 12ème année,
              ainsi qu&apos;à l&apos;Examen d&apos;État.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4EA6F5]" />
            <span>
              <strong className="font-semibold text-slate-700">Critère d&apos;Âge :</strong>{' '}
              Être âgé(e) de strictement moins de 20 ans au 1er septembre 2026.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4EA6F5]" />
            <span>
              <strong className="font-semibold text-slate-700">Cohorte de Graduation :</strong>{' '}
              Avoir obtenu son Diplôme d&apos;État en 2024, 2025 ou 2026.
            </span>
          </li>
        </ul>
      </div>

      <div className="rounded-md border border-[#4EA6F5]/20 bg-[#4EA6F5]/5 p-5">
        <p className="text-sm leading-relaxed text-slate-600">
          Toutefois, votre excellence demeure. Votre dossier d&apos;admission standard reste actif,
          et nous vous encourageons vivement à poursuivre votre inscription pour intégrer notre
          prestigieux cursus universitaire.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center gap-2 rounded-md bg-[#021463]
                     px-6 text-sm font-semibold text-white transition-colors hover:bg-[#021463]/90"
        >
          Retourner au Tableau de Bord
          <ChevronRight className="h-4 w-4" />
        </Link>
        <p className="text-xs text-slate-400">
          Une erreur ?{' '}
          <a
            href="mailto:admissions@ignitoacademy.com"
            className="text-[#4EA6F5] hover:underline"
          >
            admissions@ignitoacademy.com
          </a>
        </p>
      </div>
    </div>
  )
}

// ─── Submitted (locked) view ──────────────────────────────────────────────────
// Once the video URL is saved the dossier is sealed — no further editing.

function SubmittedView({ videoUrl }: { videoUrl: string }) {
  const embedUrl = toEmbedUrl(videoUrl)

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Submission confirmation banner */}
      <div className="flex items-start gap-3.5 rounded-lg border border-[#10B981]/25
                      bg-[#10B981]/8 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center
                        rounded-md bg-[#10B981]/15">
          <ShieldCheck className="h-4.5 w-4.5 text-[#10B981]" />
        </div>
        <div>
          <p className="font-serif text-base font-semibold text-slate-800">
            Plaidoyer Transmis au Comité
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-500">
            Votre vidéo a été sécurisée et transmise au comité académique d&apos;Ignito Academy.
            Les délibérations pour les 20 bourses d&apos;excellence sont en cours. Les résultats
            officiels vous seront communiqués à l&apos;issue de cette session d&apos;évaluation.
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
        Nous vous remercions pour votre candidature à la Bourse d&apos;Excellence.
        À l&apos;issue des délibérations, votre dossier n&apos;a pas été retenu pour cette session.
        Votre admission au cursus universitaire reste pleinement confirmée.
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

      {/* Eligibility banner */}
      <EligibilityBanner />

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

      {/* Eligibility banner */}
      <EligibilityBanner />

      {/* Evaluation criteria card */}
      <div className="rounded-lg bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center
                          rounded-md bg-[#031463]/8">
            <Award className="h-5 w-5 text-[#031463]" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-semibold text-slate-800">
              Évaluation d&apos;Éligibilité : Bourse d&apos;Excellence
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              L&apos;admission à notre programme de bourse est hautement sélective. Elle est
              réservée aux candidats démontrant un parcours académique exceptionnel et un potentiel
              de leadership avéré pour intégrer notre cohorte d&apos;élite.
            </p>
          </div>
        </div>

        <div className="ml-12 space-y-1 pb-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2.5">
            Conditions Préalables d&apos;Examen :
          </p>
          <ul className="space-y-2.5 text-sm text-slate-600">
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#4EA6F5]" />
              <span>
                <strong className="font-semibold text-slate-700">Excellence Académique :</strong>{' '}
                Moyenne générale minimale de 70% exigée continuellement pour les classes de
                10ème, 11ème, 12ème année, ainsi qu&apos;à l&apos;Examen d&apos;État.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#4EA6F5]" />
              <span>
                <strong className="font-semibold text-slate-700">Critère d&apos;Âge :</strong>{' '}
                Être âgé(e) de strictement moins de 20 ans au 1er septembre 2026.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#4EA6F5]" />
              <span>
                <strong className="font-semibold text-slate-700">Cohorte de Graduation :</strong>{' '}
                Avoir obtenu son Diplôme d&apos;État en 2024, 2025 ou 2026.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Video plaidoyer card */}
      <div className="rounded-lg bg-white p-6 shadow-sm space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center
                          rounded-md bg-[#031463]/8">
            <Play className="h-5 w-5 text-[#031463]" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-semibold text-slate-800">
              Votre Plaidoyer Vidéo
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Au-delà des relevés de notes, notre comité d&apos;admission recherche des esprits
              visionnaires. Dans une vidéo de deux minutes, présentez vos ambitions, votre vision
              du leadership, et démontrez en quoi vous incarnerez l&apos;excellence de notre cohorte
              universitaire.
            </p>
          </div>
        </div>
        <ul className="mt-1 ml-12 space-y-1.5 text-xs text-slate-500">
          {[
            'Durée stricte : 2 minutes maximum.',
            'Format : Présentez-vous face caméra, dans un environnement calme et professionnel.',
            'Hébergement : Publiez votre vidéo sur YouTube (en mode "Non répertorié") ou sur Vimeo.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-1.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#4EA6F5]" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* URL input */}
      <div className="rounded-lg bg-white p-6 shadow-sm space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="video-url" className="block text-sm font-medium text-slate-700">
            Lien URL de votre plaidoyer (YouTube ou Vimeo) <span className="text-[#EF4444]">*</span>
          </label>
          <div className="relative">
            <Play className="pointer-events-none absolute left-3 top-1/2 h-4 w-4
                             -translate-y-1/2 text-slate-400" />
            <input
              id="video-url"
              type="url"
              value={videoUrl}
              onChange={(e) => { setVideoUrl(e.target.value); setSaveError(null) }}
              placeholder="https://www.youtube.com/watch?v=..."
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
              Transmission en cours...
            </span>
          ) : (
            'Soumettre mon profil à l\'évaluation académique'
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Eligibility confirmed banner ────────────────────────────────────────────

function EligibilityBanner() {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-[#10B981]/25 bg-[#10B981]/8 px-5 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#10B981]/15">
        <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
      </div>
      <div>
        <p className="font-serif text-base font-semibold text-slate-800">
          Éligibilité Confirmée
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Félicitations. L&apos;examen de votre parcours scolaire témoigne d&apos;une excellence académique
          remarquable. Vous êtes officiellement invité(e) à postuler pour notre Bourse d&apos;Excellence,
          une distinction strictement limitée à <strong>20 candidats</strong> par session.
        </p>
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
            La Bourse d&apos;Excellence Académique
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Une distinction prestigieuse réservée aux futurs leaders.
          </p>
        </div>
      </div>
    </div>
  )
}
