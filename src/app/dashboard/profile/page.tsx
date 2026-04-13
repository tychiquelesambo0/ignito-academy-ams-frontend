'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileSchema, type ProfileFormData } from '@/lib/validation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  User,
  MapPin,
  Phone,
  Info,
} from 'lucide-react'
import Link from 'next/link'
import { useApplication } from '@/lib/context/ApplicationContext'
import { useApplicationSteps } from '@/lib/hooks/useApplicationSteps'
import BackButton from '@/components/dashboard/BackButton'
import SubmittedLockBanner from '@/components/dashboard/SubmittedLockBanner'

// ─── DRC provinces (26 official provinces + Kinshasa) ─────────────────────────

const DRC_PROVINCES = [
  'Kinshasa',
  'Bas-Uélé',
  'Équateur',
  'Haut-Katanga',
  'Haut-Lomami',
  'Haut-Uélé',
  'Ituri',
  'Kasaï',
  'Kasaï Central',
  'Kasaï Oriental',
  'Kongo Central',
  'Kwango',
  'Kwilu',
  'Lomami',
  'Lualaba',
  'Mai-Ndombe',
  'Maniema',
  'Mongala',
  'Nord-Kivu',
  'Nord-Ubangi',
  'Sankuru',
  'Sud-Kivu',
  'Sud-Ubangi',
  'Tanganyika',
  'Tshopo',
  'Tshuapa',
] as const

// ─── Small reusable primitives ─────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1 text-xs text-[#EF4444]">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#021463]/8">
        <Icon className="h-4.5 w-4.5 text-[#021463]" />
      </div>
      <div>
        <h2 className="font-serif text-base font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { application, refetch } = useApplication()
  const steps       = useApplicationSteps()
  const nextStep    = steps.find((s) => s.id === 'academic-history')

  const isLocked =
    application?.payment_status === 'Confirmed' ||
    application?.payment_status === 'Waived'

  const [pageLoading,    setPageLoading]    = useState(true)
  const [saving,         setSaving]         = useState(false)
  const [saveSuccess,    setSaveSuccess]    = useState(false)
  const [savedPhone,     setSavedPhone]     = useState<string | null>(null)
  const [saveError,      setSaveError]      = useState<string | null>(null)
  const [validationMsg,  setValidationMsg]  = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
  } = useForm<ProfileFormData>({ resolver: zodResolver(profileSchema) })

  // ── Load existing applicant data ───────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { window.location.href = '/apply'; return }

        const { data: a } = await supabase
          .from('applicants')
          .select('*')
          .eq('id', user.id)
          .single()

        if (a) {
          setValue('prenom',  a.prenom)
          setValue('postnom', a.postnom ?? '')
          setValue('nom',     a.nom)
          setValue('email',   a.email)
          setValue('phoneNumber', a.phone_number)
          // date_naissance comes as "YYYY-MM-DD" from Supabase — use first 10 chars
          setValue('dateNaissance', a.date_naissance ? a.date_naissance.substring(0, 10) : '')
          setValue('adresseComplete', a.adresse_complete ?? '')
          setValue('commune',         a.commune          ?? '')
          setValue('ville',           a.ville            ?? '')
          setValue('province',        a.province         ?? '')
          setValue('codePostal',      a.code_postal      ?? '')
        }
      } catch (err) {
        console.error('[ProfilePage] load error:', err)
      } finally {
        setPageLoading(false)
      }
    }
    load()
  }, [setValue])

  // ── Save ───────────────────────────────────────────────────────────────────
  // Two separate UPDATE calls so address-column failures never block core saves.
  // Core fields (prenom, nom, phone, date) always exist in the live schema.
  // Address fields require migration 20260413_add_profile_fields.sql.
  const onSubmit = async (data: ProfileFormData) => {
    setSaving(true)
    setSaveSuccess(false)
    setSavedPhone(null)
    setSaveError(null)
    setValidationMsg(null)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      // ── 1. Core identity & contact — always present in the live schema ────
      // Chain .select().single() so we can confirm the row was actually written.
      // Supabase returns { data: null, error: null } on a silent RLS block —
      // checking `savedRow` is the only reliable way to detect that case.
      const { data: savedRow, error: coreError } = await supabase
        .from('applicants')
        .update({
          prenom:         data.prenom,
          nom:            data.nom,
          phone_number:   data.phoneNumber,
          date_naissance: data.dateNaissance,
        })
        .eq('id', user.id)
        .select('id, prenom, nom, phone_number, date_naissance')
        .single()

      console.log('[ProfilePage] core update result →', { savedRow, coreError })

      if (coreError) {
        console.error('[ProfilePage] core update error:', coreError)
        throw new Error(`Erreur (informations personnelles) : ${coreError.message}`)
      }

      if (!savedRow) {
        throw new Error(
          'La mise à jour n\'a pas pu être enregistrée en base de données. ' +
          'Votre session a peut-être expirée — veuillez vous déconnecter puis ' +
          'vous reconnecter et réessayer.'
        )
      }

      // Re-populate form from the database-confirmed values so the user
      // sees exactly what was persisted, not just what they typed.
      setValue('prenom',      savedRow.prenom)
      setValue('nom',         savedRow.nom)
      setValue('phoneNumber', savedRow.phone_number)
      setValue('dateNaissance', savedRow.date_naissance
        ? String(savedRow.date_naissance).substring(0, 10)
        : ''
      )
      setSavedPhone(savedRow.phone_number)

      // ── 2. Address & extended fields — requires migration 20260413 ─────────
      // Use null for empty/undefined values — never send undefined to Supabase.
      const { data: savedAddress, error: addressError } = await supabase
        .from('applicants')
        .update({
          postnom:          data.postnom?.trim()          || null,
          adresse_complete: data.adresseComplete?.trim()  || null,
          commune:          data.commune?.trim()           || null,
          ville:            data.ville?.trim()             || null,
          province:         data.province?.trim()          || null,
          code_postal:      data.codePostal?.trim()        || null,
        })
        .eq('id', user.id)
        .select('id, adresse_complete, commune, ville, province')
        .single()

      console.log('[ProfilePage] address update result →', { savedAddress, addressError })

      if (addressError) {
        // Migration not yet applied — core save already succeeded; surface a
        // clear, actionable message instead of failing silently.
        console.error('[ProfilePage] address update error:', addressError)
        if (
          addressError.code === '42703' ||
          addressError.message.toLowerCase().includes('schema cache') ||
          addressError.message.toLowerCase().includes('column')
        ) {
          setSaveError(
            'Colonnes d\'adresse manquantes — veuillez appliquer la migration ' +
            '20260413 dans votre tableau de bord Supabase. ' +
            'Vos informations personnelles ont bien été enregistrées.'
          )
        } else {
          setSaveError(`Erreur (adresse) : ${addressError.message}`)
        }
        // Core fields were confirmed saved above — still refresh context.
        await refetch()
        setSaveSuccess(true)
        return
      }

      // ── 3. All good — refresh context & signal success ────────────────────
      await refetch()
      setSaveSuccess(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde'
      setSaveError(msg)
      console.error('[ProfilePage] save failed:', msg)
    } finally {
      setSaving(false)
    }
  }

  // ── Validation error handler — fires when Zod rejects the form ─────────────
  // Shows a top-level banner so the user cannot miss which field is invalid.
  const onFormInvalid = () => {
    setValidationMsg(
      'Veuillez corriger les champs marqués en rouge avant d\'enregistrer.'
    )
    // Scroll to the top of the form so the banner is immediately visible
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="max-w-2xl space-y-8 animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-md bg-slate-200" />
          <div className="h-4 w-72 rounded-md bg-slate-100" />
        </div>
        {[5, 3, 5].map((n, i) => (
          <div key={i} className="rounded-lg bg-white p-6 shadow-sm space-y-5">
            <div className="h-4 w-40 rounded-md bg-slate-200" />
            {Array.from({ length: n }).map((_, j) => (
              <div key={j} className="space-y-1.5">
                <div className="h-3 w-24 rounded-md bg-slate-200" />
                <div className="h-12 rounded-md bg-slate-100" />
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div>

      <BackButton href="/dashboard" label="Tableau de bord" />

      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-slate-800">
          Mon Profil
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Renseignez vos informations personnelles pour votre dossier de
          candidature au{' '}
          <span className="font-medium text-slate-700">
            UK Level 3 Foundation Diploma
          </span>
          .
        </p>
      </div>

      {/* ── Lock banner — shown once payment is confirmed ── */}
      {isLocked && <SubmittedLockBanner />}

      {/* ── Validation banner (fires when required fields are missing) ── */}
      {!isLocked && validationMsg && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200
                        bg-amber-50 px-4 py-3 animate-in fade-in duration-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-800">{validationMsg}</p>
        </div>
      )}

      {/* fieldset[disabled] disables every input/select/button inside when locked */}
      <fieldset disabled={isLocked} className="contents">
      <form onSubmit={handleSubmit(onSubmit, onFormInvalid)} className="space-y-6" noValidate>

        {/* ── Section 1: Identité civile ─────────────────────────────────── */}
        <div className="rounded-lg bg-white p-6 shadow-sm space-y-5">
          <SectionHeader
            icon={User}
            title="Identité civile"
            subtitle="Saisissez votre nom tel qu'il figure sur votre document d'identité."
          />

          {/* Prénom + Postnom */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="prenom" className="text-sm font-medium text-slate-700">
                Prénom <span className="text-[#EF4444]">*</span>
              </Label>
              <Input
                id="prenom"
                {...register('prenom')}
                placeholder="Jean"
                className={`min-h-[48px] ${errors.prenom ? 'border-[#EF4444]/60 focus-visible:ring-[#EF4444]/20' : 'border-slate-200 focus-visible:ring-[#4EA6F5]/30 focus-visible:border-[#4EA6F5]'}`}
              />
              <FieldError message={errors.prenom?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="postnom" className="text-sm font-medium text-slate-700">
                Postnom
                <span className="ml-1.5 text-[10px] font-normal text-slate-400 uppercase tracking-wide">
                  optionnel
                </span>
              </Label>
              <Input
                id="postnom"
                {...register('postnom')}
                placeholder="Kabila"
                className="min-h-[48px] border-slate-200 focus-visible:ring-[#4EA6F5]/30 focus-visible:border-[#4EA6F5]"
              />
              <FieldError message={errors.postnom?.message} />
            </div>
          </div>

          {/* Nom */}
          <div className="space-y-1.5">
            <Label htmlFor="nom" className="text-sm font-medium text-slate-700">
              Nom de famille <span className="text-[#EF4444]">*</span>
            </Label>
            <Input
              id="nom"
              {...register('nom')}
              placeholder="Wilondja"
              className={`min-h-[48px] ${errors.nom ? 'border-[#EF4444]/60 focus-visible:ring-[#EF4444]/20' : 'border-slate-200 focus-visible:ring-[#4EA6F5]/30 focus-visible:border-[#4EA6F5]'}`}
            />
            <FieldError message={errors.nom?.message} />
          </div>
        </div>

        {/* ── Section 2: Coordonnées ────────────────────────────────────── */}
        <div className="rounded-lg bg-white p-6 shadow-sm space-y-5">
          <SectionHeader
            icon={Phone}
            title="Coordonnées"
          />

          {/* Email (read-only) */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-slate-700">
              Adresse e-mail
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              disabled
              className="min-h-[48px] border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400">
              L'adresse e-mail est liée à votre compte et ne peut pas être modifiée.
            </p>
          </div>

          {/* Téléphone + Date de naissance */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phoneNumber" className="text-sm font-medium text-slate-700">
                Téléphone <span className="text-[#EF4444]">*</span>
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="0812345678"
                {...register('phoneNumber')}
                className={`min-h-[48px] ${errors.phoneNumber ? 'border-[#EF4444]/60 focus-visible:ring-[#EF4444]/20' : 'border-slate-200 focus-visible:ring-[#4EA6F5]/30 focus-visible:border-[#4EA6F5]'}`}
              />
              <FieldError message={errors.phoneNumber?.message} />
              {!errors.phoneNumber && (
                <p className="text-xs text-slate-400">
                  Format : 081XXXXXXX ou +243XXXXXXXXX
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dateNaissance" className="text-sm font-medium text-slate-700">
                Date de naissance <span className="text-[#EF4444]">*</span>
              </Label>
              <Input
                id="dateNaissance"
                type="date"
                {...register('dateNaissance')}
                className={`min-h-[48px] ${errors.dateNaissance ? 'border-[#EF4444]/60 focus-visible:ring-[#EF4444]/20' : 'border-slate-200 focus-visible:ring-[#4EA6F5]/30 focus-visible:border-[#4EA6F5]'}`}
              />
              <FieldError message={errors.dateNaissance?.message} />
            </div>
          </div>
        </div>

        {/* ── Section 3: Adresse ────────────────────────────────────────── */}
        <div className="rounded-lg bg-white p-6 shadow-sm space-y-5">
          <SectionHeader
            icon={MapPin}
            title="Adresse de résidence"
            subtitle="Votre adresse complète en République Démocratique du Congo."
          />

          {/* Completion hint — explains why address fields have an asterisk */}
          <div className="flex items-start gap-2.5 rounded-md border border-[#4EA6F5]/20
                          bg-[#4EA6F5]/5 px-3.5 py-2.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4EA6F5]" />
            <p className="text-xs leading-relaxed text-slate-600">
              Remplissez tous les champs d'adresse (<span className="font-medium">rue, commune, ville, province</span>)
              pour débloquer l'étape <span className="font-medium">Parcours Scolaire</span>.
              Vos autres informations sont sauvegardées indépendamment.
            </p>
          </div>

          {/* Numéro et nom de la rue */}
          <div className="space-y-1.5">
            <Label htmlFor="adresseComplete" className="text-sm font-medium text-slate-700">
              Numéro et nom de la rue <span className="text-[#EF4444]">*</span>
            </Label>
            <Input
              id="adresseComplete"
              {...register('adresseComplete')}
              placeholder="12, Avenue de la Paix"
              className={`min-h-[48px] ${errors.adresseComplete ? 'border-[#EF4444]/60 focus-visible:ring-[#EF4444]/20' : 'border-slate-200 focus-visible:ring-[#4EA6F5]/30 focus-visible:border-[#4EA6F5]'}`}
            />
            <FieldError message={errors.adresseComplete?.message} />
          </div>

          {/* Commune + Ville */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="commune" className="text-sm font-medium text-slate-700">
                Commune <span className="text-[#EF4444]">*</span>
              </Label>
              <Input
                id="commune"
                {...register('commune')}
                placeholder="Gombe"
                className={`min-h-[48px] ${errors.commune ? 'border-[#EF4444]/60 focus-visible:ring-[#EF4444]/20' : 'border-slate-200 focus-visible:ring-[#4EA6F5]/30 focus-visible:border-[#4EA6F5]'}`}
              />
              <FieldError message={errors.commune?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ville" className="text-sm font-medium text-slate-700">
                Ville <span className="text-[#EF4444]">*</span>
              </Label>
              <Input
                id="ville"
                {...register('ville')}
                placeholder="Kinshasa"
                className={`min-h-[48px] ${errors.ville ? 'border-[#EF4444]/60 focus-visible:ring-[#EF4444]/20' : 'border-slate-200 focus-visible:ring-[#4EA6F5]/30 focus-visible:border-[#4EA6F5]'}`}
              />
              <FieldError message={errors.ville?.message} />
            </div>
          </div>

          {/* Province + Code postal */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="province" className="text-sm font-medium text-slate-700">
                Province <span className="text-[#EF4444]">*</span>
              </Label>
              <Controller
                name="province"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="province"
                      className={`min-h-[48px] ${errors.province ? 'border-[#EF4444]/60' : 'border-slate-200 focus:ring-[#4EA6F5]/30'}`}
                    >
                      <SelectValue placeholder="Sélectionnez une province…" />
                    </SelectTrigger>
                    <SelectContent>
                      {DRC_PROVINCES.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.province?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="codePostal" className="text-sm font-medium text-slate-700">
                Code postal
                <span className="ml-1.5 text-[10px] font-normal text-slate-400 uppercase tracking-wide">
                  optionnel
                </span>
              </Label>
              <Input
                id="codePostal"
                {...register('codePostal')}
                placeholder="00001"
                className="min-h-[48px] border-slate-200 focus-visible:ring-[#4EA6F5]/30 focus-visible:border-[#4EA6F5]"
              />
              <FieldError message={errors.codePostal?.message} />
            </div>
          </div>
        </div>

        {/* ── Feedback ──────────────────────────────────────────────────── */}
        {saveSuccess && (
          <div className="rounded-lg border border-[#4EA6F5]/20 bg-[#4EA6F5]/5 p-5
                          animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#10B981]" />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Profil enregistré avec succès.
                </p>
                {nextStep?.unlocked && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    L'étape suivante est maintenant débloquée.
                  </p>
                )}
              </div>
            </div>

            {/* Next-step CTA — only shown when step is now unlocked */}
            {nextStep?.unlocked && (
              <Link
                href={nextStep.href}
                className="mt-4 flex h-10 w-full items-center justify-center gap-2
                           rounded-md bg-[#021463] text-xs font-semibold text-white
                           transition-colors hover:bg-[#031a80]"
              >
                Étape suivante : {nextStep.label}
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        )}

        {saveError && (
          <div className="flex items-start gap-3 rounded-lg border border-[#EF4444]/20 bg-[#EF4444]/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#EF4444]" />
            <p className="text-sm text-[#EF4444]">{saveError}</p>
          </div>
        )}

        {/* ── Submit — hidden when dossier is sealed ──────────────────── */}
        {!isLocked && (
          <button
            type="submit"
            disabled={saving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md
                       bg-[#021463] text-sm font-semibold text-white transition-colors
                       hover:bg-[#031a80] disabled:cursor-not-allowed disabled:opacity-60
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4EA6F5]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enregistrement…
              </>
            ) : (
              'Enregistrer les modifications'
            )}
          </button>
        )}
      </form>
      </fieldset>
    </div>
  )
}
