/**
 * Validation Schemas
 * 
 * Zod schemas for form validation with:
 * - Phone number sanitization
 * - Grade validation
 * - Prohibited keyword detection
 * - French error messages
 */

import { z } from 'zod'
import { sanitizePhoneNumber } from './phone'
import { containsProhibitedKeyword } from './keywords'
import { videoURLSchema } from '@/lib/scholarship'

// ============================================================================
// PHONE NUMBER SCHEMA
// ============================================================================

/**
 * Phone number schema with auto-sanitization
 * Accepts: 081XXXXXXX, 0XXXXXXXXX, 243XXXXXXXXX, +243XXXXXXXXX
 * Returns: +243XXXXXXXXX (E.164 format)
 */
export const phoneNumberSchema = z
  .string()
  .min(1, 'Le numéro de téléphone est requis')
  .transform((val) => {
    try {
      return sanitizePhoneNumber(val)
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Numéro de téléphone invalide')
    }
  })

// ============================================================================
// GRADE VALIDATION SCHEMAS
// ============================================================================

/**
 * Grade schema (0-100)
 */
export const gradeSchema = z
  .number({
    required_error: 'La note est requise',
    invalid_type_error: 'La note doit être un nombre',
  })
  .min(0, 'La note doit être au minimum 0%')
  .max(100, 'La note doit être au maximum 100%')

/**
 * Optional grade schema (allows null/undefined)
 */
export const optionalGradeSchema = z
  .number()
  .min(0, 'La note doit être au minimum 0%')
  .max(100, 'La note doit être au maximum 100%')
  .nullable()
  .optional()

// ============================================================================
// TEXT FIELD SCHEMAS WITH KEYWORD DETECTION
// ============================================================================

/**
 * Text field schema with prohibited keyword detection
 */
export const textFieldSchema = (fieldName: string, maxLength: number = 255) =>
  z
    .string()
    .min(1, `${fieldName} est requis`)
    .max(maxLength, `${fieldName} ne peut pas dépasser ${maxLength} caractères`)
    .refine(
      (val) => !containsProhibitedKeyword(val),
      {
        message: 'Le mot "OTHM" n\'est pas autorisé. Utilisez "UK Level 3 Foundation Diploma".',
      }
    )

/**
 * Optional text field schema with keyword detection
 */
export const optionalTextFieldSchema = (maxLength: number = 255) =>
  z
    .string()
    .max(maxLength, `Le texte ne peut pas dépasser ${maxLength} caractères`)
    .refine(
      (val) => !val || !containsProhibitedKeyword(val),
      {
        message: 'Le mot "OTHM" n\'est pas autorisé. Utilisez "UK Level 3 Foundation Diploma".',
      }
    )
    .optional()

// ============================================================================
// PROFILE SCHEMA
// ============================================================================

/**
 * Applicant profile schema
 */
export const profileSchema = z.object({
  prenom: textFieldSchema('Le prénom', 100),
  nom: textFieldSchema('Le nom', 100),
  dateOfBirth: z.date({
    required_error: 'La date de naissance est requise',
    invalid_type_error: 'Date de naissance invalide',
  }),
  phoneNumber: phoneNumberSchema,
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Adresse email invalide'),
  address: optionalTextFieldSchema(500),
})

export type ProfileFormData = z.infer<typeof profileSchema>

// ============================================================================
// ACADEMIC HISTORY SCHEMA
// ============================================================================

/**
 * Academic history schema with grade validation
 */
export const academicHistorySchema = z.object({
  ecoleProvenance: textFieldSchema('L\'école de provenance', 255),
  optionAcademique: textFieldSchema('L\'option académique', 255),
  
  // Grades (all required for scholarship eligibility)
  grade10Average: optionalGradeSchema,
  grade11Average: optionalGradeSchema,
  grade12Average: optionalGradeSchema,
  exetatPercentage: optionalGradeSchema,
  
  graduationYear: z
    .number({
      required_error: 'L\'année de graduation est requise',
      invalid_type_error: 'L\'année doit être un nombre',
    })
    .min(2024, 'L\'année de graduation doit être au minimum 2024')
    .max(2100, 'L\'année de graduation doit être au maximum 2100'),
  
  // English proficiency (NOT used for scholarship eligibility)
  englishProficiencyLevel: z
    .enum(['beginner', 'intermediate', 'advanced', 'fluent'], {
      required_error: 'Le niveau d\'anglais est requis',
    })
    .optional(),
})

export type AcademicHistoryFormData = z.infer<typeof academicHistorySchema>

// ============================================================================
// SCHOLARSHIP APPLICATION SCHEMA
// ============================================================================

/**
 * Scholarship application schema
 */
export const scholarshipApplicationSchema = z.object({
  // Academic grades (all required)
  grade10Average: gradeSchema,
  grade11Average: gradeSchema,
  grade12Average: gradeSchema,
  exetatPercentage: gradeSchema,
  
  graduationYear: z
    .number({
      required_error: 'L\'année de graduation est requise',
    })
    .min(2024, 'L\'année de graduation doit être au minimum 2024'),
  
  // Video URL (required for scholarship)
  scholarshipVideoUrl: videoURLSchema,
})

export type ScholarshipApplicationFormData = z.infer<typeof scholarshipApplicationSchema>

// ============================================================================
// PAYMENT SCHEMA
// ============================================================================

/**
 * Payment initiation schema
 */
export const paymentSchema = z.object({
  phoneNumber: phoneNumberSchema,
  amount: z
    .number()
    .min(29, 'Le montant minimum est de 29 USD')
    .max(29, 'Le montant doit être exactement 29 USD'),
})

export type PaymentFormData = z.infer<typeof paymentSchema>

// ============================================================================
// DOCUMENT UPLOAD SCHEMA
// ============================================================================

/**
 * Document upload schema
 */
export const documentUploadSchema = z.object({
  documentType: z.enum(
    ['diplome', 'bulletin_10', 'bulletin_11', 'bulletin_12', 'carte_identite', 'autre'],
    {
      required_error: 'Le type de document est requis',
    }
  ),
  description: optionalTextFieldSchema(500),
})

export type DocumentUploadFormData = z.infer<typeof documentUploadSchema>
