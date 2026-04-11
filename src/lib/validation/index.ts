/**
 * Validation Module
 * 
 * Exports validation schemas, phone sanitization, and keyword detection
 */

// Export phone utilities
export {
  sanitizePhoneNumber,
  isValidDRCPhoneNumber,
  formatPhoneNumberLocal,
} from './phone'

// Export keyword detection
export {
  containsProhibitedKeyword,
  getProhibitedKeyword,
  validateNoProhibitedKeywords,
} from './keywords'

// Export schemas and types
export {
  phoneNumberSchema,
  gradeSchema,
  optionalGradeSchema,
  textFieldSchema,
  optionalTextFieldSchema,
  profileSchema,
  academicHistorySchema,
  scholarshipApplicationSchema,
  paymentSchema,
  documentUploadSchema,
} from './schemas'

export type {
  ProfileFormData,
  AcademicHistoryFormData,
  ScholarshipApplicationFormData,
  PaymentFormData,
  DocumentUploadFormData,
} from './schemas'
