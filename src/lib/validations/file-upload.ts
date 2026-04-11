/**
 * File upload validation utilities.
 * Enforces allowed MIME types, extensions, and file size limits.
 */

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const

export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number]

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'] as const

export type AllowedExtension = typeof ALLOWED_EXTENSIONS[number]

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  // 5 MB

export interface FileValidationResult {
  valid:   boolean
  errors:  string[]
}

/**
 * Validates that the MIME type is in the allowed list.
 */
export function validateMimeType(mimeType: string): FileValidationResult {
  const allowed = ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)
  return {
    valid:  allowed,
    errors: allowed
      ? []
      : [`Type MIME non pris en charge : ${mimeType}. Types acceptés : PDF, JPEG, PNG.`],
  }
}

/**
 * Validates that the file extension is in the allowed list.
 * Extension comparison is case-insensitive.
 */
export function validateFileExtension(filename: string): FileValidationResult {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  const allowed = ALLOWED_EXTENSIONS.includes(ext as AllowedExtension)
  return {
    valid:  allowed,
    errors: allowed
      ? []
      : [`Extension de fichier non prise en charge : ${ext}. Extensions acceptées : .pdf, .jpg, .jpeg, .png.`],
  }
}

/**
 * Validates a file against all upload rules:
 *   1. MIME type must be allowed
 *   2. Extension must be allowed
 *   3. Size must not exceed MAX_FILE_SIZE_BYTES
 *
 * All errors accumulate — a file may fail multiple rules.
 */
export function validateFileUpload(
  filename: string,
  mimeType: string,
  sizeBytes: number,
): FileValidationResult {
  const errors: string[] = []

  const mimeResult = validateMimeType(mimeType)
  if (!mimeResult.valid) errors.push(...mimeResult.errors)

  const extResult = validateFileExtension(filename)
  if (!extResult.valid) errors.push(...extResult.errors)

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2)
    errors.push(
      `Le fichier dépasse la taille maximale autorisée de 5 Mo (taille actuelle : ${sizeMb} Mo).`,
    )
  }

  return { valid: errors.length === 0, errors }
}
