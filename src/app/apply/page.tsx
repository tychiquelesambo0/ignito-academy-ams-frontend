'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, ArrowLeft, Award, Globe, Shield, Loader2 } from 'lucide-react'
import { registrationSchema, type RegistrationFormData } from '@/lib/validations/auth'
import { loginSchema, type LoginFormData } from '@/lib/validations/login'

// ─── Sign Up Form ────────────────────────────────────────────────────────────

function SignUpForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormData>({ resolver: zodResolver(registrationSchema) })

  const onSubmit = async (data: RegistrationFormData) => {
    setServerError(null)

    try {
      // Sanitize phone number to E.164 format
      const { sanitizePhoneNumber } = await import('@/lib/utils/phone')
      const sanitizedPhone = sanitizePhoneNumber(data.phone_number)
      
      // Supabase Auth - Sign up new applicant
      const { signUpApplicant } = await import('@/lib/supabase/auth')
      const { error } = await signUpApplicant({
        email: data.email,
        password: data.password,
        prenom: data.prenom,
        nom: data.nom,
        phone_number: sanitizedPhone,
        date_naissance: data.date_naissance,
      })
      
      if (error) {
        console.error('Registration error:', error)
        setServerError(error.message || 'Une erreur est survenue lors de l\'inscription.')
        return
      }
      
      router.push(`/apply/confirm-email?email=${encodeURIComponent(data.email)}`)
    } catch (err) {
      console.error('Unexpected registration error:', err)
      setServerError('Une erreur inattendue est survenue. Veuillez réessayer.')
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>

      {serverError && (
        <div className="p-3 bg-[#EF4444]/8 border border-[#EF4444]/20 rounded-md text-[#EF4444] text-sm leading-relaxed">
          {serverError}
        </div>
      )}

      {/* Prénom + Nom */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="prenom" className="text-sm font-medium text-[#1E293B]">
            Prénom <span className="text-[#EF4444]">*</span>
          </Label>
          <Input
            id="prenom"
            placeholder="Jean"
            {...register('prenom')}
            className="min-h-[48px] border-[#E2E8F0] focus-visible:ring-[#021463]/20 focus-visible:border-[#021463]"
          />
          {errors.prenom && <p className="text-xs text-[#EF4444]">{errors.prenom.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nom" className="text-sm font-medium text-[#1E293B]">
            Nom <span className="text-[#EF4444]">*</span>
          </Label>
          <Input
            id="nom"
            placeholder="Kabila"
            {...register('nom')}
            className="min-h-[48px] border-[#E2E8F0] focus-visible:ring-[#021463]/20 focus-visible:border-[#021463]"
          />
          {errors.nom && <p className="text-xs text-[#EF4444]">{errors.nom.message}</p>}
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="signup-email" className="text-sm font-medium text-[#1E293B]">
          Adresse email <span className="text-[#EF4444]">*</span>
        </Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="exemple@email.com"
          autoComplete="email"
          {...register('email')}
          className="min-h-[48px] border-[#E2E8F0] focus-visible:ring-[#021463]/20 focus-visible:border-[#021463]"
        />
        {errors.email && <p className="text-xs text-[#EF4444]">{errors.email.message}</p>}
      </div>

      {/* Téléphone */}
      <div className="space-y-1.5">
        <Label htmlFor="phone_number" className="text-sm font-medium text-[#1E293B]">
          Téléphone <span className="text-[#EF4444]">*</span>
        </Label>
        <Input
          id="phone_number"
          placeholder="0812345678 ou +243812345678"
          autoComplete="tel"
          {...register('phone_number')}
          className="min-h-[48px] border-[#E2E8F0] focus-visible:ring-[#021463]/20 focus-visible:border-[#021463]"
        />
        {errors.phone_number
          ? <p className="text-xs text-[#EF4444]">{errors.phone_number.message}</p>
          : <p className="text-xs text-[#1E293B]/40">Format accepté : 0XXXXXXXXX ou +243XXXXXXXXX</p>
        }
      </div>

      {/* Date de naissance */}
      <div className="space-y-1.5">
        <Label htmlFor="date_naissance" className="text-sm font-medium text-[#1E293B]">
          Date de naissance <span className="text-[#EF4444]">*</span>
        </Label>
        <Input
          id="date_naissance"
          type="date"
          {...register('date_naissance')}
          className="min-h-[48px] border-[#E2E8F0] focus-visible:ring-[#021463]/20 focus-visible:border-[#021463]"
        />
        {errors.date_naissance && <p className="text-xs text-[#EF4444]">{errors.date_naissance.message}</p>}
      </div>

      {/* Mot de passe */}
      <div className="space-y-1.5">
        <Label htmlFor="signup-password" className="text-sm font-medium text-[#1E293B]">
          Mot de passe <span className="text-[#EF4444]">*</span>
        </Label>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Minimum 6 caractères"
            autoComplete="new-password"
            {...register('password')}
            className="min-h-[48px] border-[#E2E8F0] pr-12 focus-visible:ring-[#021463]/20 focus-visible:border-[#021463]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Masquer' : 'Afficher'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1E293B]/35 hover:text-[#1E293B]/65 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-[#EF4444]">{errors.password.message}</p>}
      </div>

      {/* Confirmer mot de passe */}
      <div className="space-y-1.5">
        <Label htmlFor="confirm-password" className="text-sm font-medium text-[#1E293B]">
          Confirmer le mot de passe <span className="text-[#EF4444]">*</span>
        </Label>
        <div className="relative">
          <Input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirmez votre mot de passe"
            autoComplete="new-password"
            {...register('confirmPassword')}
            className="min-h-[48px] border-[#E2E8F0] pr-12 focus-visible:ring-[#021463]/20 focus-visible:border-[#021463]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Masquer' : 'Afficher'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1E293B]/35 hover:text-[#1E293B]/65 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.confirmPassword && <p className="text-xs text-[#EF4444]">{errors.confirmPassword.message}</p>}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full min-h-[50px] bg-[#4EA6F5] hover:bg-[#4EA6F5]/90 text-white font-semibold rounded-md text-sm mt-2 shadow-sm shadow-[#4EA6F5]/25 transition-all"
      >
        {isSubmitting
          ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Création en cours…</>
          : 'Créer mon compte'
        }
      </Button>

      <p className="text-center text-xs text-[#1E293B]/45 leading-relaxed pt-1">
        En créant un compte, vous acceptez nos{' '}
        <span className="text-[#021463] font-medium cursor-pointer hover:underline">
          conditions d&apos;utilisation
        </span>
        .
      </p>
    </form>
  )
}

// ─── Login Form ──────────────────────────────────────────────────────────────

function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Forgot-password view state
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null)

    try {
      // Supabase Auth - Sign in with password
      const { signIn } = await import('@/lib/supabase/auth')
      const { user, error } = await signIn(data.email, data.password)
      
      if (error) {
        console.error('Login error:', error)
        setServerError(`Email ou mot de passe incorrect. Veuillez réessayer. (${error.message})`)
        return
      }

      if (!user) {
        setServerError('Aucun utilisateur trouvé.')
        return
      }

      console.log('Login successful, user:', user)
      
      // Wait a moment for cookies to be set
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Redirect to dashboard with full page reload to establish session
      console.log('Redirecting to dashboard...')
      window.location.href = '/dashboard'
    } catch (err) {
      console.error('Unexpected login error:', err)
      setServerError('Une erreur inattendue est survenue. Veuillez réessayer.')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError(null)
    if (!resetEmail.trim()) {
      setResetError('Veuillez saisir votre adresse email.')
      return
    }
    setIsResetting(true)
    
    // Supabase Auth - Send password reset email
    const { resetPassword } = await import('@/lib/supabase/auth')
    const { error } = await resetPassword(resetEmail)
    
    setIsResetting(false)
    
    if (error) {
      setResetError('Une erreur est survenue. Veuillez réessayer.')
      return
    }
    
    setResetSent(true)
  }

  // ── Forgot-password view ──────────────────────────────────────────────────
  if (showForgotPassword) {
    return (
      <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">

        {/* Back link */}
        <button
          type="button"
          onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetError(null); setResetEmail('') }}
          className="flex items-center gap-1.5 text-xs text-[#1E293B]/50 hover:text-[#021463] font-medium transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-3 h-3" />
          Retour à la connexion
        </button>

        {resetSent ? (
          <div className="space-y-4">
            <div className="p-4 bg-[#10B981]/8 border border-[#10B981]/25 rounded-lg">
              <p className="text-sm text-[#10B981] font-medium mb-1">Lien envoyé !</p>
              <p className="text-xs text-[#1E293B]/60 leading-relaxed">
                Un lien de réinitialisation a été envoyé à <span className="font-medium text-[#1E293B]">{resetEmail}</span>.
                Vérifiez votre boîte de réception et suivez les instructions.
              </p>
            </div>
            <p className="text-xs text-[#1E293B]/45 text-center">
              Vous n&apos;avez pas reçu l&apos;email ?{' '}
              <button
                type="button"
                onClick={() => setResetSent(false)}
                className="text-[#4EA6F5] font-medium hover:underline"
              >
                Renvoyer
              </button>
            </p>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <h3 className="font-serif text-xl font-bold text-[#021463] mb-1">
                Mot de passe oublié
              </h3>
              <p className="text-xs text-[#1E293B]/55 leading-relaxed">
                Saisissez l&apos;adresse email liée à votre dossier. Nous vous enverrons un lien pour créer un nouveau mot de passe.
              </p>
            </div>

            {resetError && (
              <div className="p-3 bg-[#EF4444]/8 border border-[#EF4444]/20 rounded-md text-[#EF4444] text-sm">
                {resetError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="reset-email" className="text-sm font-medium text-[#1E293B]">
                Adresse email
              </Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="exemple@email.com"
                autoComplete="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="min-h-[48px] border-[#E2E8F0] focus-visible:ring-[#021463]/20 focus-visible:border-[#021463]"
              />
            </div>

            <Button
              type="submit"
              disabled={isResetting}
              className="w-full min-h-[50px] bg-[#4EA6F5] hover:bg-[#4EA6F5]/90 text-white font-semibold rounded-md text-sm shadow-sm shadow-[#4EA6F5]/25 transition-all"
            >
              {isResetting
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Envoi en cours…</>
                : 'Envoyer le lien de réinitialisation'
              }
            </Button>
          </form>
        )}
      </div>
    )
  }

  // ── Standard login view ───────────────────────────────────────────────────
  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>

      {serverError && (
        <div className="p-3 bg-[#EF4444]/8 border border-[#EF4444]/20 rounded-md text-[#EF4444] text-sm leading-relaxed">
          {serverError}
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="login-email" className="text-sm font-medium text-[#1E293B]">
          Adresse email
        </Label>
        <Input
          id="login-email"
          type="email"
          placeholder="exemple@email.com"
          autoComplete="email"
          {...register('email')}
          className="min-h-[48px] border-[#E2E8F0] focus-visible:ring-[#021463]/20 focus-visible:border-[#021463]"
        />
        {errors.email && <p className="text-xs text-[#EF4444]">{errors.email.message}</p>}
      </div>

      {/* Mot de passe */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor="login-password" className="text-sm font-medium text-[#1E293B]">
            Mot de passe
          </Label>
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="text-xs text-[#4EA6F5] font-medium hover:underline transition-colors"
          >
            Mot de passe oublié ?
          </button>
        </div>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Votre mot de passe"
            autoComplete="current-password"
            {...register('password')}
            className="min-h-[48px] border-[#E2E8F0] pr-12 focus-visible:ring-[#021463]/20 focus-visible:border-[#021463]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Masquer' : 'Afficher'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1E293B]/35 hover:text-[#1E293B]/65 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-[#EF4444]">{errors.password.message}</p>}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full min-h-[50px] bg-[#4EA6F5] hover:bg-[#4EA6F5]/90 text-white font-semibold rounded-md text-sm mt-2 shadow-sm shadow-[#4EA6F5]/25 transition-all"
      >
        {isSubmitting
          ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Connexion en cours…</>
          : 'Connexion'
        }
      </Button>

      <p className="text-center text-xs text-[#1E293B]/45 pt-1">
        Vous n&apos;avez pas encore de dossier ?{' '}
        <Link href="/apply?tab=dossier" className="text-[#021463] font-medium hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  )
}

// ─── Gateway Shell ────────────────────────────────────────────��───────────────

function AdmittaGateway() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') === 'connexion' ? 'connexion' : 'dossier'
  const [activeTab, setActiveTab] = useState<'dossier' | 'connexion'>(defaultTab as 'dossier' | 'connexion')

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left Panel (Navy Brand) — Hidden on mobile ── */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient flex-col relative overflow-hidden">

        {/* Animated orbs */}
        <div className="hero-orb-1 absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full opacity-[0.12] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #4EA6F5 0%, transparent 70%)' }} />
        <div className="hero-orb-2 absolute top-1/2 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.10] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #4EA6F5 0%, transparent 70%)' }} />
        <div className="hero-orb-3 absolute -bottom-20 left-1/3 w-[320px] h-[320px] rounded-full opacity-[0.08] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #7ec8ff 0%, transparent 70%)' }} />

        {/* Subtle dot texture */}
        <div className="absolute inset-0 pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="admitta-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="14" cy="14" r="1" fill="white" opacity="0.06" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#admitta-dots)" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col h-full p-8 lg:p-12">

          {/* Back link */}
          <div>
            <Link href="https://ignitoacademy.com" className="inline-flex items-center gap-2 group min-h-[44px]">
              <ArrowLeft className="w-3.5 h-3.5 text-white/40 group-hover:text-white/70 transition-colors" />
              <span className="text-white/45 text-xs font-medium tracking-widest uppercase group-hover:text-white/70 transition-colors">
                Retour
              </span>
            </Link>
          </div>

          {/* Wordmark */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="space-y-7">
              <div>
                <h1 className="font-serif text-6xl lg:text-[88px] font-bold text-white leading-none tracking-tight">
                  Admitta
                </h1>
                <div className="flex items-center gap-2.5 mt-5">
                  <div className="h-px w-14 bg-[#4EA6F5]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4EA6F5]" />
                </div>
              </div>

              <p className="text-white/60 text-[15px] leading-relaxed font-light max-w-md">
                Le portail d&apos;admission officiel de{' '}
                <span className="text-white font-normal">Ignito Academy</span>.
                {' '}Soumettez votre candidature et accédez à nos licences britanniques depuis la RDC.
              </p>

              {/* Trust signals */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Award className="w-4 h-4 text-[#4EA6F5]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium leading-tight">Excellence Britannique · Cadre RQF</p>
                    <p className="text-white/40 text-xs mt-0.5">Cursus aligné sur le cadre officiel</p>
                  </div>
                </div>
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-4 h-4 text-[#4EA6F5]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium leading-tight">Cohorte Septembre 2026</p>
                    <p className="text-white/40 text-xs mt-0.5">Inscriptions ouvertes — places limitées</p>
                  </div>
                </div>
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-[#4EA6F5]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium leading-tight">Sécurisé &amp; confidentiel</p>
                    <p className="text-white/40 text-xs mt-0.5">Vos données sont protégées</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel (Auth) ── */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white min-h-screen">

        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-serif text-xl font-bold text-[#021463]">Admitta</span>
          <Link
            href="https://ignitoacademy.com"
            className="flex items-center gap-1.5 text-sm text-[#021463]/55 hover:text-[#021463] transition-colors min-h-[44px] px-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour
          </Link>
        </div>

        {/* Centered auth card */}
        <div className="flex-1 flex items-center justify-center px-4 py-6 lg:px-16 lg:py-10">
          <div className="w-full max-w-md">

            <div className="mb-6">
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#021463] mb-2">
                Bienvenue sur Admitta
              </h2>
              <p className="text-[#1E293B]/55 text-sm leading-relaxed">
                Veuillez vous identifier pour suivre votre candidature ou déposer un nouveau dossier.
              </p>
            </div>

            {/* ── Tab switcher buttons ── */}
            <div className="grid grid-cols-2 mb-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-1 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('dossier')}
                className={`py-3 text-sm font-medium rounded-md transition-all duration-150 min-h-[48px] ${
                  activeTab === 'dossier'
                    ? 'bg-[#021463] text-white shadow-sm'
                    : 'text-[#1E293B]/55 hover:text-[#1E293B]/80'
                }`}
              >
                Créer un dossier
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('connexion')}
                className={`py-3 text-sm font-medium rounded-md transition-all duration-150 min-h-[48px] ${
                  activeTab === 'connexion'
                    ? 'bg-[#021463] text-white shadow-sm'
                    : 'text-[#1E293B]/55 hover:text-[#1E293B]/80'
                }`}
              >
                Se connecter
              </button>
            </div>

            {/* Cross-fade content */}
            <div className="grid">
              <div
                className="[grid-area:1/1] transition-opacity duration-[120ms] ease-in-out"
                style={{ opacity: activeTab === 'dossier' ? 1 : 0, pointerEvents: activeTab === 'dossier' ? 'auto' : 'none' }}
              >
                <SignUpForm />
              </div>
              <div
                className="[grid-area:1/1] transition-opacity duration-[120ms] ease-in-out"
                style={{ opacity: activeTab === 'connexion' ? 1 : 0, pointerEvents: activeTab === 'connexion' ? 'auto' : 'none' }}
              >
                <LoginForm />
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 lg:px-16 lg:pb-6 text-center">
          <p className="text-xs text-[#1E293B]/25">
            © 2026 Ignito Academy. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#021463]" />}>
      <AdmittaGateway />
    </Suspense>
  )
}
