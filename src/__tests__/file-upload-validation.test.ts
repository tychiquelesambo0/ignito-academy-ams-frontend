/**
 * Unit tests: File upload validation — MIME type, extension, combined rules
 * (File size validation is covered separately in file-size-validation.test.ts)
 * Requirements: 6.1–6.5 (document upload constraints)
 */

import { describe, it, expect } from 'vitest'

// ─── Validation constants ─────────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  // 5 MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
])

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png'])

// ─── Pure validation functions ────────────────────────────────────────────────

function validateMimeType(mimeType: string): { valid: boolean; error?: string } {
  if (!mimeType) return { valid: false, error: 'Le type MIME est requis.' }
  if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: `Type de fichier non autorisé : "${mimeType}". Types acceptés : PDF, JPEG, PNG.`,
    }
  }
  return { valid: true }
}

function validateFileExtension(fileName: string): { valid: boolean; error?: string } {
  if (!fileName) return { valid: false, error: 'Le nom du fichier est requis.' }
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex === -1) return { valid: false, error: 'Le fichier doit avoir une extension.' }
  const ext = fileName.slice(dotIndex).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Extension non autorisée : "${ext}". Extensions acceptées : .pdf, .jpg, .jpeg, .png.`,
    }
  }
  return { valid: true }
}

interface FileInput {
  name:     string
  size:     number
  mimeType: string
}

function validateFileUpload(file: FileInput): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  const mimeResult = validateMimeType(file.mimeType)
  if (!mimeResult.valid) errors.push(mimeResult.error!)

  const extResult = validateFileExtension(file.name)
  if (!extResult.valid) errors.push(extResult.error!)

  if (file.size <= 0) errors.push('Le fichier est vide.')
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(2)
    errors.push(`La taille du fichier (${mb} Mo) dépasse la limite de 5 Mo.`)
  }

  return { valid: errors.length === 0, errors }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('File upload validation — MIME types', () => {

  describe('accepted MIME types', () => {
    const valid = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ]
    valid.forEach(mime => {
      it(`accepts "${mime}"`, () => {
        expect(validateMimeType(mime).valid).toBe(true)
      })
    })
  })

  describe('rejected MIME types', () => {
    const invalid = [
      'application/msword',        // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
      'text/plain',
      'text/html',
      'video/mp4',
      'application/zip',
      'application/octet-stream',
      '',
    ]
    invalid.forEach(mime => {
      it(`rejects "${mime || '(empty)'}"`, () => {
        expect(validateMimeType(mime).valid).toBe(false)
      })
    })
  })

  it('is case-insensitive (IMAGE/JPEG accepted)', () => {
    expect(validateMimeType('IMAGE/JPEG').valid).toBe(true)
  })

  it('returns French error message for rejected type', () => {
    const r = validateMimeType('image/gif')
    expect(r.error).toMatch(/type de fichier/i)
    expect(r.error).toMatch(/PDF|JPEG|PNG/)
  })
})

describe('File upload validation — extensions', () => {

  describe('accepted extensions', () => {
    const valid = [
      'document.pdf',
      'photo.jpg',
      'photo.jpeg',
      'scan.png',
      'BULLETIN.PDF',     // case insensitive
      'file name with spaces.pdf',
    ]
    valid.forEach(name => {
      it(`accepts "${name}"`, () => {
        expect(validateFileExtension(name).valid).toBe(true)
      })
    })
  })

  describe('rejected extensions', () => {
    const invalid = [
      'document.doc',
      'spreadsheet.xlsx',
      'image.gif',
      'image.webp',
      'archive.zip',
      'script.js',
      'styles.css',
      'data.json',
      'noextension',
      '',
    ]
    invalid.forEach(name => {
      it(`rejects "${name || '(empty)'}"`, () => {
        expect(validateFileExtension(name).valid).toBe(false)
      })
    })
  })

  it('rejects file with no extension', () => {
    expect(validateFileExtension('noextension').valid).toBe(false)
  })

  it('handles file names with multiple dots correctly', () => {
    expect(validateFileExtension('my.file.name.pdf').valid).toBe(true)
    expect(validateFileExtension('my.file.name.doc').valid).toBe(false)
  })
})

describe('File upload validation — combined rules', () => {

  it('accepts a valid PDF under 5 MB', () => {
    const result = validateFileUpload({
      name:     'passport.pdf',
      size:     1_024_000,
      mimeType: 'application/pdf',
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('accepts a valid JPEG at exactly 5 MB', () => {
    const result = validateFileUpload({
      name:     'diploma.jpg',
      size:     MAX_FILE_SIZE_BYTES,
      mimeType: 'image/jpeg',
    })
    expect(result.valid).toBe(true)
  })

  it('rejects a valid extension but forbidden MIME type', () => {
    const result = validateFileUpload({
      name:     'disguised.pdf',
      size:     500_000,
      mimeType: 'application/javascript',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => /MIME|type/i.test(e))).toBe(true)
  })

  it('rejects a valid MIME type but forbidden extension', () => {
    const result = validateFileUpload({
      name:     'document.exe',
      size:     500_000,
      mimeType: 'application/pdf',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => /extension/i.test(e))).toBe(true)
  })

  it('rejects a file exceeding 5 MB', () => {
    const result = validateFileUpload({
      name:     'huge.pdf',
      size:     MAX_FILE_SIZE_BYTES + 1,
      mimeType: 'application/pdf',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => /taille|Mo/i.test(e))).toBe(true)
  })

  it('rejects an empty file (0 bytes)', () => {
    const result = validateFileUpload({
      name:     'empty.pdf',
      size:     0,
      mimeType: 'application/pdf',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => /vide/i.test(e))).toBe(true)
  })

  it('accumulates multiple errors when both MIME type and size fail', () => {
    const result = validateFileUpload({
      name:     'bad.gif',
      size:     MAX_FILE_SIZE_BYTES + 1,
      mimeType: 'image/gif',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })

  it('exactly 5 MB boundary — valid', () => {
    expect(validateFileUpload({
      name: 'boundary.pdf', size: MAX_FILE_SIZE_BYTES, mimeType: 'application/pdf',
    }).valid).toBe(true)
  })

  it('5 MB + 1 byte boundary — invalid', () => {
    expect(validateFileUpload({
      name: 'over.pdf', size: MAX_FILE_SIZE_BYTES + 1, mimeType: 'application/pdf',
    }).valid).toBe(false)
  })
})
