import { z } from 'zod'

const gradeField = z
  .number()
  .min(0,   'La note doit être ≥ 0')
  .max(100, 'La note doit être ≤ 100')

export const academicHistorySchema = z.object({
  ecole_provenance: z
    .string()
    .min(2, "Le nom de l'école doit contenir au moins 2 caractères")
    .max(200, "Le nom de l'école ne peut pas dépasser 200 caractères"),

  option_academique: z
    .string()
    .min(2, "L'option doit contenir au moins 2 caractères")
    .max(100, "L'option ne peut pas dépasser 100 caractères"),

  exam_status: z.enum(['En attente des résultats', 'Diplôme obtenu'], {
    error: 'Veuillez sélectionner un statut',
  }),

  graduation_year: z
    .number()
    .min(2020, 'Année invalide')
    .max(2026, 'Année invalide'),

  grade_10_average: gradeField,
  grade_11_average: gradeField,
  grade_12_average: gradeField,

  // Optional — only required when exam_status === 'Diplôme obtenu'
  exetat_percentage: z
    .number()
    .min(0,   'Le pourcentage doit être ≥ 0')
    .max(100, 'Le pourcentage doit être ≤ 100')
    .optional(),
})

export type AcademicHistoryFormData = z.infer<typeof academicHistorySchema>
