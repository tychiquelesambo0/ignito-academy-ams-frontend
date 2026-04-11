/**
 * Scholarship Eligibility Calculation
 * 
 * Determines if an applicant qualifies for a scholarship based on:
 * - Academic performance (grades >= 70%)
 * - Age (< 20 years on September 1st of intake year)
 * - Graduation year (>= 2024)
 * 
 * IMPORTANT: English proficiency is NOT considered in eligibility
 */

/**
 * Scholarship eligibility result
 */
export interface EligibilityResult {
  /** Is the applicant eligible? */
  isEligible: boolean
  
  /** Reasons for ineligibility (empty if eligible) */
  reasons: string[]
  
  /** Calculated age on September 1st */
  ageOnSeptember1st?: number
  
  /** Average of all grades */
  averageGrade?: number
}

/**
 * Scholarship limit check result
 */
export interface ScholarshipLimitResult {
  /** Has the limit been reached? */
  limitReached: boolean
  
  /** Current number of scholarships awarded */
  currentCount: number
  
  /** Maximum scholarships allowed */
  maxScholarships: number
}

/**
 * Maximum scholarships per intake year
 */
export const MAX_SCHOLARSHIPS_PER_YEAR = 20

/**
 * Minimum grade average required for scholarship
 */
export const MIN_GRADE_AVERAGE = 70

/**
 * Maximum age on September 1st for scholarship eligibility
 */
export const MAX_AGE_ON_SEPTEMBER_1ST = 19

/**
 * Minimum graduation year for scholarship eligibility
 */
export const MIN_GRADUATION_YEAR = 2024

/**
 * Calculate age on September 1st of a given year
 * 
 * @param dateOfBirth - Date of birth
 * @param intakeYear - Intake year (e.g., 2026)
 * @returns Age on September 1st of the intake year
 */
export function calculateAge(dateOfBirth: Date, intakeYear: number): number {
  // September 1st of the intake year
  const september1st = new Date(intakeYear, 8, 1) // Month is 0-indexed (8 = September)
  
  // Calculate age
  let age = september1st.getFullYear() - dateOfBirth.getFullYear()
  
  // Adjust if birthday hasn't occurred yet by September 1st
  const birthdayThisYear = new Date(
    september1st.getFullYear(),
    dateOfBirth.getMonth(),
    dateOfBirth.getDate()
  )
  
  if (september1st < birthdayThisYear) {
    age--
  }
  
  return age
}

/**
 * Calculate scholarship eligibility
 * 
 * @param params - Eligibility parameters
 * @returns Eligibility result with reasons if ineligible
 */
export function calculateScholarshipEligibility(params: {
  grade10Average?: number | null
  grade11Average?: number | null
  grade12Average?: number | null
  exetatPercentage?: number | null
  dateOfBirth: Date
  graduationYear: number
  intakeYear: number
}): EligibilityResult {
  const reasons: string[] = []
  
  // Extract parameters
  const {
    grade10Average,
    grade11Average,
    grade12Average,
    exetatPercentage,
    dateOfBirth,
    graduationYear,
    intakeYear,
  } = params
  
  // ============================================================================
  // 1. Check if all required grades are provided
  // ============================================================================
  
  const grades = [grade10Average, grade11Average, grade12Average, exetatPercentage]
  const hasAllGrades = grades.every(grade => grade !== null && grade !== undefined)
  
  if (!hasAllGrades) {
    reasons.push('Toutes les notes (10e, 11e, 12e année, et EXETAT) sont requises')
    return {
      isEligible: false,
      reasons,
    }
  }
  
  // ============================================================================
  // 2. Calculate average grade
  // ============================================================================
  
  const validGrades = grades.filter((g): g is number => g !== null && g !== undefined)
  const averageGrade = validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length
  
  // ============================================================================
  // 3. Check grade average >= 70%
  // ============================================================================
  
  if (averageGrade < MIN_GRADE_AVERAGE) {
    reasons.push(
      `Moyenne académique insuffisante: ${averageGrade.toFixed(1)}% (minimum requis: ${MIN_GRADE_AVERAGE}%)`
    )
  }
  
  // Check individual grades
  validGrades.forEach((grade, index) => {
    if (grade < MIN_GRADE_AVERAGE) {
      const gradeNames = ['10e année', '11e année', '12e année', 'EXETAT']
      reasons.push(
        `Note de ${gradeNames[index]} insuffisante: ${grade}% (minimum requis: ${MIN_GRADE_AVERAGE}%)`
      )
    }
  })
  
  // ============================================================================
  // 4. Check age < 20 on September 1st
  // ============================================================================
  
  const ageOnSeptember1st = calculateAge(dateOfBirth, intakeYear)
  
  if (ageOnSeptember1st > MAX_AGE_ON_SEPTEMBER_1ST) {
    reasons.push(
      `Âge trop élevé: ${ageOnSeptember1st} ans au 1er septembre ${intakeYear} (maximum: ${MAX_AGE_ON_SEPTEMBER_1ST} ans)`
    )
  }
  
  // ============================================================================
  // 5. Check graduation year >= 2024
  // ============================================================================
  
  if (graduationYear < MIN_GRADUATION_YEAR) {
    reasons.push(
      `Année de graduation invalide: ${graduationYear} (minimum: ${MIN_GRADUATION_YEAR})`
    )
  }
  
  // ============================================================================
  // 6. Return result
  // ============================================================================
  
  return {
    isEligible: reasons.length === 0,
    reasons,
    ageOnSeptember1st,
    averageGrade,
  }
}

/**
 * Check if scholarship limit has been reached for a given intake year
 * 
 * @param currentCount - Current number of scholarships awarded
 * @returns Limit check result
 */
export function hasReachedScholarshipLimit(currentCount: number): ScholarshipLimitResult {
  return {
    limitReached: currentCount >= MAX_SCHOLARSHIPS_PER_YEAR,
    currentCount,
    maxScholarships: MAX_SCHOLARSHIPS_PER_YEAR,
  }
}

/**
 * Format eligibility reasons for display
 * 
 * @param reasons - Array of ineligibility reasons
 * @returns Formatted string
 */
export function formatEligibilityReasons(reasons: string[]): string {
  if (reasons.length === 0) {
    return 'Éligible pour une bourse'
  }
  
  if (reasons.length === 1) {
    return `Non éligible: ${reasons[0]}`
  }
  
  return `Non éligible:\n${reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
}
