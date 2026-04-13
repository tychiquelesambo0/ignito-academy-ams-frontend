'use client'

/**
 * Parcours Scolaire — Academic History Form
 *
 * Allows the applicant to record their academic background:
 *   - School name & option
 *   - Grades for Years 10, 11, 12 and EXETAT (0–100)
 *   - Graduation year
 *   - English proficiency level (strict CEFR: A1–C2)
 *
 * Note: This page retains its own data-fetching for now.
 * It will be migrated to consume ApplicationContext in the next step.
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { academicHistorySchema, type AcademicHistoryFormData } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, CheckCircle2, AlertCircle, GraduationCap, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useApplication } from '@/lib/context/ApplicationContext'
import { useApplicationSteps } from '@/lib/hooks/useApplicationSteps'
import StepGate from '@/components/dashboard/StepGate'
import BackButton from '@/components/dashboard/BackButton'
import SubmittedLockBanner from '@/components/dashboard/SubmittedLockBanner'

// CEFR level display labels (A1 = DB constraint value = UI value)
const CEFR_LEVELS = [
  { value: 'A1', label: 'A1 — Débutant' },
  { value: 'A2', label: 'A2 — Élémentaire' },
  { value: 'B1', label: 'B1 — Intermédiaire' },
  { value: 'B2', label: 'B2 — Intermédiaire supérieur' },
  { value: 'C1', label: 'C1 — Avancé' },
  { value: 'C2', label: 'C2 — Maîtrise' },
] as const

function AcademicHistoryForm() {
  const { application, refetch } = useApplication()
  const steps       = useApplicationSteps()
  const nextStep    = steps.find((s) => s.id === 'documents')

  const isLocked =
    application?.payment_status === 'Confirmed' ||
    application?.payment_status === 'Waived'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AcademicHistoryFormData>({
    resolver: zodResolver(academicHistorySchema),
  })

  const englishLevel = watch('englishProficiencyLevel')

  // Load existing academic data
  useEffect(() => {
    async function loadAcademic() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/apply'
          return
        }

        const { data: application } = await supabase
          .from('applications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (application) {
          setValue('ecoleProvenance', application.ecole_provenance ?? '')
          setValue('optionAcademique', application.option_academique ?? '')
          if (application.grade_10_average != null)
            setValue('grade10Average', application.grade_10_average)
          if (application.grade_11_average != null)
            setValue('grade11Average', application.grade_11_average)
          if (application.grade_12_average != null)
            setValue('grade12Average', application.grade_12_average)
          if (application.exetat_percentage != null)
            setValue('exetatPercentage', application.exetat_percentage)
          if (application.graduation_year != null)
            setValue('graduationYear', application.graduation_year)
          // english_proficiency_level is CEFR in DB (A1–C2)
          if (application.english_proficiency_level) {
            setValue(
              'englishProficiencyLevel',
              application.english_proficiency_level as AcademicHistoryFormData['englishProficiencyLevel'],
            )
          }
        }
      } catch (err) {
        console.error('[AcademicHistory] load error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadAcademic()
  }, [setValue])

  const onSubmit = async (data: AcademicHistoryFormData) => {
    setSaving(true)
    setSaveSuccess(false)
    setSaveError(null)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      // updated_at is managed by the DB trigger — do not send it manually.
      // .select().single() lets us detect silent RLS failures (null data, no error).
      const { data: savedRow, error } = await supabase
        .from('applications')
        .update({
          ecole_provenance:          data.ecoleProvenance,
          option_academique:         data.optionAcademique,
          grade_10_average:          data.grade10Average          ?? null,
          grade_11_average:          data.grade11Average          ?? null,
          grade_12_average:          data.grade12Average          ?? null,
          exetat_percentage:         data.exetatPercentage        ?? null,
          graduation_year:           data.graduationYear,
          english_proficiency_level: data.englishProficiencyLevel ?? null,
        })
        .eq('user_id', user.id)
        .select('user_id, ecole_provenance, grade_10_average')
        .single()

      console.log('[AcademicHistory] update result →', { savedRow, error })

      if (error) {
        console.error('[AcademicHistory] save error:', error)
        throw new Error(error.message)
      }

      if (!savedRow) {
        throw new Error(
          'La mise à jour n\'a pas pu être enregistrée. ' +
          'Votre session a peut-être expirée — déconnectez-vous et reconnectez-vous.'
        )
      }

      console.log('[AcademicHistory] confirmed saved school:', savedRow.ecole_provenance)

      // Refresh context so step unlock and sidebar reflect saved grades
      await refetch()
      setSaveSuccess(true)
    } catch (err) {
      console.error('[AcademicHistory] save error:', err)
      setSaveError(
        err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.',
      )
    } finally {
      setSaving(false)
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#4EA6F5]" />
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <div>
      <BackButton href="/dashboard/profile" label="Mon Profil" />

      {/* Page header */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-[#4EA6F5]">
          <GraduationCap className="h-5 w-5" />
          <span className="text-sm font-medium">Dossier de candidature</span>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-slate-800">
          Parcours Scolaire
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Renseignez vos informations académiques avec précision. Ces données
          déterminent votre éligibilité à la bourse d'excellence.
        </p>
      </div>

      {/* ── Lock banner — shown once payment is confirmed ── */}
      {isLocked && <SubmittedLockBanner />}

      {/* fieldset[disabled] disables every input/select/button inside when locked */}
      <fieldset disabled={isLocked} className="contents">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Section 1: École ── */}
        <section className="rounded-lg bg-white p-6 shadow-sm space-y-5">
          <h2 className="font-serif text-lg font-semibold text-slate-800">
            École de provenance
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="ecoleProvenance" className="text-slate-700">
              Nom de l'école <span className="text-[#EF4444]">*</span>
            </Label>
            <Input
              id="ecoleProvenance"
              placeholder="Ex : Institut Boboto, Collège Boboto…"
              {...register('ecoleProvenance')}
              className={errors.ecoleProvenance ? 'border-[#EF4444]' : ''}
            />
            {errors.ecoleProvenance && (
              <p className="text-xs text-[#EF4444]">{errors.ecoleProvenance.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="optionAcademique" className="text-slate-700">
              Option académique <span className="text-[#EF4444]">*</span>
            </Label>
            <Input
              id="optionAcademique"
              placeholder="Ex : Math-Physique, Biologie-Chimie, Pédagogie…"
              {...register('optionAcademique')}
              className={errors.optionAcademique ? 'border-[#EF4444]' : ''}
            />
            {errors.optionAcademique && (
              <p className="text-xs text-[#EF4444]">{errors.optionAcademique.message}</p>
            )}
          </div>
        </section>

        {/* ── Section 2: Notes ── */}
        <section className="rounded-lg bg-white p-6 shadow-sm space-y-5">
          <div>
            <h2 className="font-serif text-lg font-semibold text-slate-800">
              Notes académiques
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Toutes les moyennes sont exprimées en pourcentage (0–100).
              Un minimum de 70 % dans chaque année est requis pour l'éligibilité
              à la bourse.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Grade 10 */}
            <div className="space-y-1.5">
              <Label htmlFor="grade10Average" className="text-slate-700">
                Moyenne — 10ème année (%)
              </Label>
              <Input
                id="grade10Average"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0 – 100"
                {...register('grade10Average', { valueAsNumber: true })}
                className={errors.grade10Average ? 'border-[#EF4444]' : ''}
              />
              {errors.grade10Average && (
                <p className="text-xs text-[#EF4444]">{errors.grade10Average.message}</p>
              )}
            </div>

            {/* Grade 11 */}
            <div className="space-y-1.5">
              <Label htmlFor="grade11Average" className="text-slate-700">
                Moyenne — 11ème année (%)
              </Label>
              <Input
                id="grade11Average"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0 – 100"
                {...register('grade11Average', { valueAsNumber: true })}
                className={errors.grade11Average ? 'border-[#EF4444]' : ''}
              />
              {errors.grade11Average && (
                <p className="text-xs text-[#EF4444]">{errors.grade11Average.message}</p>
              )}
            </div>

            {/* Grade 12 */}
            <div className="space-y-1.5">
              <Label htmlFor="grade12Average" className="text-slate-700">
                Moyenne — 12ème année (%)
              </Label>
              <Input
                id="grade12Average"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0 – 100"
                {...register('grade12Average', { valueAsNumber: true })}
                className={errors.grade12Average ? 'border-[#EF4444]' : ''}
              />
              {errors.grade12Average && (
                <p className="text-xs text-[#EF4444]">{errors.grade12Average.message}</p>
              )}
            </div>

            {/* EXETAT */}
            <div className="space-y-1.5">
              <Label htmlFor="exetatPercentage" className="text-slate-700">
                Pourcentage EXETAT (%)
              </Label>
              <Input
                id="exetatPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0 – 100"
                {...register('exetatPercentage', { valueAsNumber: true })}
                className={errors.exetatPercentage ? 'border-[#EF4444]' : ''}
              />
              {errors.exetatPercentage && (
                <p className="text-xs text-[#EF4444]">{errors.exetatPercentage.message}</p>
              )}
            </div>
          </div>

          {/* Graduation year */}
          <div className="space-y-1.5">
            <Label htmlFor="graduationYear" className="text-slate-700">
              Année de graduation <span className="text-[#EF4444]">*</span>
            </Label>
            <Input
              id="graduationYear"
              type="number"
              min="2000"
              max="2100"
              placeholder="2025"
              {...register('graduationYear', { valueAsNumber: true })}
              className={errors.graduationYear ? 'border-[#EF4444]' : ''}
            />
            {errors.graduationYear && (
              <p className="text-xs text-[#EF4444]">{errors.graduationYear.message}</p>
            )}
          </div>
        </section>

        {/* ── Section 3: English Proficiency ── */}
        <section className="rounded-lg bg-white p-6 shadow-sm space-y-4">
          <div>
            <h2 className="font-serif text-lg font-semibold text-slate-800">
              Niveau d'anglais
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Cette information est utilisée pour le programme d'anglais intensif.
              Elle n'affecte <em>pas</em> l'éligibilité à la bourse.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="englishProficiencyLevel" className="text-slate-700">
              Niveau CECRL (Cadre européen commun de référence)
            </Label>
            <Select
              value={englishLevel ?? ''}
              onValueChange={(v) =>
                setValue(
                  'englishProficiencyLevel',
                  v as AcademicHistoryFormData['englishProficiencyLevel'],
                )
              }
            >
              <SelectTrigger id="englishProficiencyLevel">
                <SelectValue placeholder="Sélectionnez votre niveau" />
              </SelectTrigger>
              <SelectContent>
                {CEFR_LEVELS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* ── Feedback ── */}
        {saveSuccess && (
          <div className="rounded-lg border border-[#4EA6F5]/20 bg-[#4EA6F5]/5 p-5
                          animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#10B981]" />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Parcours scolaire enregistré avec succès.
                </p>
                {nextStep?.unlocked && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    L'étape suivante est maintenant débloquée.
                  </p>
                )}
              </div>
            </div>

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
          <div className="flex items-center gap-2.5 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/8 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-[#EF4444]" />
            <p className="text-sm text-[#EF4444]">{saveError}</p>
          </div>
        )}

        {/* ── Submit — hidden when dossier is sealed ── */}
        {!isLocked && (
          <Button
            type="submit"
            disabled={saving}
            className="h-12 w-full rounded-md bg-[#021463] text-white
                       hover:bg-[#031a80] disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement…
              </>
            ) : (
              'Enregistrer les modifications'
            )}
          </Button>
        )}
      </form>
      </fieldset>
    </div>
  )
}

// ── Page export — wrapped in StepGate so direct URL access is protected ────────

export default function AcademicHistoryPage() {
  return (
    <StepGate stepId="academic-history">
      <AcademicHistoryForm />
    </StepGate>
  )
}
