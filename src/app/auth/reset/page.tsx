'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react'

function ResetPasswordForm() {
  const router      = useRouter()
  const searchParams = useSearchParams()

  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [isLoading, setIsLoading]     = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [success, setSuccess]         = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionError, setSessionError] = useState(false)

  // Verify the recovery token from the email link
  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    const type      = searchParams.get('type')

    if (!tokenHash || type !== 'recovery') {
      setSessionError(true)
      return
    }

    const supabase = createClient()
    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: 'recovery' })
      .then(({ error }) => {
        if (error) {
          console.error('[reset] OTP verification failed:', error.message)
          setSessionError(true)
        } else {
          setSessionReady(true)
        }
      })
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setIsLoading(true)
    const supabase = createClient()
    const { error: updateErr } = await supabase.auth.updateUser({ password })
    setIsLoading(false)

    if (updateErr) {
      setError('Une erreur est survenue lors de la mise à jour. Veuillez réessayer.')
      console.error('[reset] updateUser error:', updateErr.message)
      return
    }

    setSuccess(true)
    // Sign out so the user logs in fresh with the new password
    await supabase.auth.signOut()
    setTimeout(() => router.push('/apply?tab=connexion'), 3000)
  }

  return (
    <div className="min-h-screen flex">

      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient flex-col relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full opacity-[0.12] pointer-events-none hero-orb-1"
          style={{ background: 'radial-gradient(circle, #4EA6F5 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.10] pointer-events-none hero-orb-2"
          style={{ background: 'radial-gradient(circle, #4EA6F5 0%, transparent 70%)' }} />
        <div className="absolute inset-0 pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="reset-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="14" cy="14" r="1" fill="white" opacity="0.06" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#reset-dots)" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col h-full p-12">
          <div>
            <span className="text-white/45 text-xs font-medium tracking-widest uppercase">
              Ignito Academy
            </span>
          </div>
          <div className="flex-1 flex flex-col justify-center space-y-6">
            <h1 className="font-serif text-[88px] font-bold text-white leading-none tracking-tight">
              Admitta
            </h1>
            <div className="flex items-center gap-2.5">
              <div className="h-px w-14 bg-[#4EA6F5]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#4EA6F5]" />
            </div>
            <p className="text-white/60 text-[15px] leading-relaxed font-light">
              Réinitialisation sécurisée de votre mot de passe.{' '}
              <span className="text-white font-normal">Vos données sont protégées.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white min-h-screen">

        {/* Mobile header */}
        <div className="lg:hidden flex items-center px-6 py-4 border-b border-gray-100">
          <span className="font-serif text-xl font-bold text-[#021463]">Admitta</span>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10 lg:px-16">
          <div className="w-full max-w-md">

            {/* Invalid / expired token */}
            {sessionError && (
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-lg bg-[#EF4444]/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-[#EF4444]" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#021463] mb-2">
                    Lien invalide ou expiré
                  </h2>
                  <p className="text-[#1E293B]/55 text-sm leading-relaxed">
                    Ce lien de réinitialisation n&apos;est plus valide. Les liens expirent après 1 heure.
                    Veuillez en demander un nouveau depuis la page de connexion.
                  </p>
                </div>
                <Button
                  onClick={() => router.push('/apply?tab=connexion')}
                  className="w-full min-h-[50px] bg-[#021463] hover:bg-[#021463]/90 text-white font-semibold rounded-md text-sm"
                >
                  Retourner à la connexion
                </Button>
              </div>
            )}

            {/* Success state */}
            {success && (
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-[#10B981]" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#021463] mb-2">
                    Mot de passe mis à jour
                  </h2>
                  <p className="text-[#1E293B]/55 text-sm leading-relaxed">
                    Votre mot de passe a été réinitialisé avec succès. Vous allez être redirigé
                    vers la page de connexion…
                  </p>
                </div>
              </div>
            )}

            {/* Loading — verifying token */}
            {!sessionError && !success && !sessionReady && (
              <div className="flex items-center gap-3 text-[#1E293B]/50 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Vérification du lien de sécurité…
              </div>
            )}

            {/* Reset form — shown only after token is verified */}
            {!sessionError && !success && sessionReady && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="mb-2">
                  <h2 className="font-serif text-3xl font-bold text-[#021463] mb-2">
                    Nouveau mot de passe
                  </h2>
                  <p className="text-[#1E293B]/55 text-sm leading-relaxed">
                    Choisissez un nouveau mot de passe sécurisé pour votre compte Admitta.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 bg-[#EF4444]/8 border border-[#EF4444]/20 rounded-md text-[#EF4444] text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-sm font-medium text-[#1E293B]">
                    Nouveau mot de passe <span className="text-[#EF4444]">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 6 caractères"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="min-h-[48px] border-[#E2E8F0] pr-12 focus-visible:ring-[#021463]/20 focus-visible:border-[#021463]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Masquer' : 'Afficher'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#1E293B]/35 hover:text-[#1E293B]/65 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-sm font-medium text-[#1E293B]">
                    Confirmer le mot de passe <span className="text-[#EF4444]">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Retapez votre mot de passe"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="min-h-[48px] border-[#E2E8F0] pr-12 focus-visible:ring-[#021463]/20 focus-visible:border-[#021463]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      aria-label={showConfirm ? 'Masquer' : 'Afficher'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#1E293B]/35 hover:text-[#1E293B]/65 transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[50px] bg-[#4EA6F5] hover:bg-[#4EA6F5]/90 text-white font-semibold rounded-md text-sm shadow-sm shadow-[#4EA6F5]/25 transition-all"
                >
                  {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Mise à jour…</>
                    : 'Réinitialiser mon mot de passe'
                  }
                </Button>
              </form>
            )}

          </div>
        </div>

        <div className="hidden lg:block px-16 pb-6 text-center">
          <p className="text-xs text-[#1E293B]/25">© 2026 Ignito Academy. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#021463]" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
