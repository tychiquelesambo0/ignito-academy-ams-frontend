'use client'

/**
 * Academic History Page
 * 
 * Academic history form with grade validation
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { academicHistorySchema, type AcademicHistoryFormData } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function AcademicPage() {
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

  // Load academic data
  useEffect(() => {
    async function loadAcademic() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/apply'
          return
        }

        const { data: application } = await supabase
          .from('applications')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (application) {
          setValue('ecoleProvenance', application.ecole_provenance || '')
          setValue('optionAcademique', application.option_academique || '')
          setValue('grade10Average', application.grade_10_average)
          setValue('grade11Average', application.grade_11_average)
          setValue('grade12Average', application.grade_12_average)
          setValue('exetatPercentage', application.exetat_percentage)
          setValue('graduationYear', application.graduation_year || 2024)
          setValue('englishProficiencyLevel', application.english_proficiency_level)
        }
      } catch (error) {
        console.error('Error loading academic data:', error)
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

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('applications')
        .update({
          ecole_provenance: data.ecoleProvenance,
          option_academique: data.optionAcademique,
          grade_10_average: data.grade10Average,
          grade_11_average: data.grade11Average,
          grade_12_average: data.grade12Average,
          exetat_percentage: data.exetatPercentage,
          graduation_year: data.graduationYear,
          english_proficiency_level: data.englishProficiencyLevel,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (error) throw error

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving academic data:', error)
      setSaveError(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Historique Académique</h1>
        <p className="text-muted-foreground mt-2">
          Renseignez vos informations académiques
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* School Information */}
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">École de provenance</h2>

          <div className="space-y-2">
            <Label htmlFor="ecoleProvenance">
              Nom de l'école <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ecoleProvenance"
              {...register('ecoleProvenance')}
              className={errors.ecoleProvenance ? 'border-red-500' : ''}
            />
            {errors.ecoleProvenance && (
              <p className="text-sm text-red-600">{errors.ecoleProvenance.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="optionAcademique">
              Option académique <span className="text-red-500">*</span>
            </Label>
            <Input
              id="optionAcademique"
              placeholder="Ex: Math-Physique, Biologie-Chimie"
              {...register('optionAcademique')}
              className={errors.optionAcademique ? 'border-red-500' : ''}
            />
            {errors.optionAcademique && (
              <p className="text-sm text-red-600">{errors.optionAcademique.message}</p>
            )}
          </div>
        </div>

        {/* Grades */}
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Notes académiques</h2>
          <p className="text-sm text-muted-foreground">
            Toutes les notes sont requises pour l'éligibilité à la bourse (minimum 70%)
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grade10Average">Moyenne 10ème année (%)</Label>
              <Input
                id="grade10Average"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('grade10Average', { valueAsNumber: true })}
                className={errors.grade10Average ? 'border-red-500' : ''}
              />
              {errors.grade10Average && (
                <p className="text-sm text-red-600">{errors.grade10Average.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade11Average">Moyenne 11ème année (%)</Label>
              <Input
                id="grade11Average"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('grade11Average', { valueAsNumber: true })}
                className={errors.grade11Average ? 'border-red-500' : ''}
              />
              {errors.grade11Average && (
                <p className="text-sm text-red-600">{errors.grade11Average.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade12Average">Moyenne 12ème année (%)</Label>
              <Input
                id="grade12Average"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('grade12Average', { valueAsNumber: true })}
                className={errors.grade12Average ? 'border-red-500' : ''}
              />
              {errors.grade12Average && (
                <p className="text-sm text-red-600">{errors.grade12Average.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="exetatPercentage">Pourcentage EXETAT (%)</Label>
              <Input
                id="exetatPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('exetatPercentage', { valueAsNumber: true })}
                className={errors.exetatPercentage ? 'border-red-500' : ''}
              />
              {errors.exetatPercentage && (
                <p className="text-sm text-red-600">{errors.exetatPercentage.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="graduationYear">
              Année de graduation <span className="text-red-500">*</span>
            </Label>
            <Input
              id="graduationYear"
              type="number"
              min="2024"
              max="2100"
              {...register('graduationYear', { valueAsNumber: true })}
              className={errors.graduationYear ? 'border-red-500' : ''}
            />
            {errors.graduationYear && (
              <p className="text-sm text-red-600">{errors.graduationYear.message}</p>
            )}
          </div>
        </div>

        {/* English Proficiency */}
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Niveau d'anglais</h2>
          <p className="text-sm text-muted-foreground">
            Cette information n'affecte PAS l'éligibilité à la bourse
          </p>

          <div className="space-y-2">
            <Label htmlFor="englishProficiencyLevel">Niveau d'anglais</Label>
            <Select
              value={englishLevel}
              onValueChange={(value) => setValue('englishProficiencyLevel', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez votre niveau" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Débutant</SelectItem>
                <SelectItem value="intermediate">Intermédiaire</SelectItem>
                <SelectItem value="advanced">Avancé</SelectItem>
                <SelectItem value="fluent">Courant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Success/Error Messages */}
        {saveSuccess && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800">Informations enregistrées avec succès!</p>
          </div>
        )}

        {saveError && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800">{saveError}</p>
          </div>
        )}

        {/* Submit Button */}
        <Button type="submit" disabled={saving} className="w-full">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </Button>
      </form>
    </div>
  )
}
