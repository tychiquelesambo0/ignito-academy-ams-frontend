/**
 * Phone Number Sanitization Utility
 * 
 * Converts DRC phone numbers from local format to E.164 format
 * 
 * Supported formats:
 * - 081XXXXXXX → +243XXXXXXXXX
 * - 0XXXXXXXXX → +243XXXXXXXXX
 * - 243XXXXXXXXX → +243XXXXXXXXX
 * - +243XXXXXXXXX → +243XXXXXXXXX
 */

/**
 * Sanitize DRC phone number to E.164 format
 * 
 * @param phoneNumber - Phone number in any supported format
 * @returns Phone number in E.164 format (+243XXXXXXXXX)
 * @throws Error if phone number is invalid
 */
export function sanitizePhoneNumber(phoneNumber: string): string {
  // Remove all whitespace, dashes, parentheses, and dots
  let cleaned = phoneNumber.trim().replace(/[\s\-\(\)\.]/g, '')
  
  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }
  
  // Convert 0XXXXXXXXX to 243XXXXXXXXX
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '243' + cleaned.substring(1)
  }
  
  // Ensure it starts with 243
  if (!cleaned.startsWith('243')) {
    throw new Error('Numéro de téléphone invalide. Le numéro doit commencer par 0, 243 ou +243')
  }
  
  // Validate length (should be exactly 12 digits: 243 + 9 digits)
  if (cleaned.length !== 12) {
    throw new Error(`Numéro de téléphone invalide. Longueur attendue: 12 chiffres (243XXXXXXXXX), reçu: ${cleaned.length}`)
  }
  
  // Validate it contains only digits
  if (!/^\d+$/.test(cleaned)) {
    throw new Error('Numéro de téléphone invalide. Seuls les chiffres sont autorisés')
  }
  
  // Add + prefix for E.164 format
  return `+${cleaned}`
}

/**
 * Validate DRC phone number format
 * 
 * @param phoneNumber - Phone number to validate
 * @returns True if valid, false otherwise
 */
export function isValidDRCPhoneNumber(phoneNumber: string): boolean {
  try {
    sanitizePhoneNumber(phoneNumber)
    return true
  } catch {
    return false
  }
}

/**
 * Format phone number for display
 * Converts +243XXXXXXXXX to 0XXXXXXXXX (local format)
 * 
 * @param phoneNumber - Phone number in E.164 format
 * @returns Phone number in local format
 */
export function formatPhoneNumberLocal(phoneNumber: string): string {
  // Remove + and 243 prefix
  const cleaned = phoneNumber.replace(/^\+?243/, '')
  
  // Add 0 prefix
  return `0${cleaned}`
}
