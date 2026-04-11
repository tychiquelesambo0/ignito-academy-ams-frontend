/**
 * Phone Number Utilities
 * Sanitizes DRC phone numbers to E.164 format (+243XXXXXXXXX)
 */

/**
 * Sanitize phone number from local format to E.164 format
 * 
 * Examples:
 * - "0812345678" → "+243812345678"
 * - "081 234 5678" → "+243812345678"
 * - "+243812345678" → "+243812345678"
 * - "243812345678" → "+243812345678"
 */
export function sanitizePhoneNumber(phone: string): string {
  // Remove all spaces, dashes, and parentheses
  let cleaned = phone.replace(/[\s\-()]/g, '')
  
  // If starts with 0, replace with +243
  if (cleaned.startsWith('0')) {
    cleaned = '+243' + cleaned.substring(1)
  }
  
  // If starts with 243 but no +, add +
  if (cleaned.startsWith('243') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  }
  
  // If doesn't start with +243, assume it's a local number and add +243
  if (!cleaned.startsWith('+243')) {
    cleaned = '+243' + cleaned
  }
  
  return cleaned
}

/**
 * Validate E.164 phone number format
 */
export function isValidE164Phone(phone: string): boolean {
  return /^\+243[0-9]{9}$/.test(phone)
}

/**
 * Format phone number for display
 * +243812345678 → +243 81 234 5678
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone.startsWith('+243')) return phone
  
  const number = phone.substring(4) // Remove +243
  if (number.length !== 9) return phone
  
  return `+243 ${number.substring(0, 2)} ${number.substring(2, 5)} ${number.substring(5)}`
}
