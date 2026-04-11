/**
 * Scholarship Module
 * 
 * Exports scholarship eligibility calculation and video validation utilities
 */

// Export eligibility types and functions
export type { EligibilityResult, ScholarshipLimitResult } from './eligibility'
export {
  calculateAge,
  calculateScholarshipEligibility,
  hasReachedScholarshipAwardLimit,
  formatEligibilityReasons,
  MAX_SCHOLARSHIPS_AWARDED_PER_YEAR,
  MIN_GRADE_AVERAGE,
  MAX_AGE_ON_SEPTEMBER_1ST,
  MIN_GRADUATION_YEAR,
} from './eligibility'

// Export video validation types and functions
export type { VideoPlatform, VideoURLResult } from './video-validation'
export {
  validateVideoURL,
  videoURLSchema,
  isYouTubeURL,
  isVimeoURL,
  extractVideoId,
  getEmbedURL,
} from './video-validation'
