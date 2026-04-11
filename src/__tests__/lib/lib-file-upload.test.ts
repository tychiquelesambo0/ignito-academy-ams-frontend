/**
 * Coverage tests for src/lib/validations/file-upload.ts
 */
import { describe, it, expect } from 'vitest'
import {
  validateMimeType,
  validateFileExtension,
  validateFileUpload,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
} from '@/lib/validations/file-upload'

describe('validateMimeType', () => {
  ALLOWED_MIME_TYPES.forEach(mime => {
    it(`accepts ${mime}`, () => {
      expect(validateMimeType(mime).valid).toBe(true)
    })
  })

  it('rejects unsupported MIME types', () => {
    for (const bad of ['application/msword', 'text/plain', 'image/gif', 'video/mp4']) {
      const r = validateMimeType(bad)
      expect(r.valid).toBe(false)
      expect(r.errors.length).toBeGreaterThan(0)
    }
  })

  it('error message mentions accepted types', () => {
    const r = validateMimeType('image/gif')
    expect(r.errors[0]).toMatch(/PDF|JPEG|PNG/i)
  })
})

describe('validateFileExtension', () => {
  ALLOWED_EXTENSIONS.forEach(ext => {
    it(`accepts ${ext}`, () => {
      expect(validateFileExtension(`document${ext}`).valid).toBe(true)
    })
  })

  it('is case-insensitive', () => {
    expect(validateFileExtension('file.PDF').valid).toBe(true)
    expect(validateFileExtension('file.JPG').valid).toBe(true)
  })

  it('rejects disallowed extensions', () => {
    for (const bad of ['file.doc', 'file.gif', 'file.exe', 'file.txt']) {
      const r = validateFileExtension(bad)
      expect(r.valid).toBe(false)
      expect(r.errors.length).toBeGreaterThan(0)
    }
  })
})

describe('validateFileUpload', () => {
  it('passes a valid small PDF', () => {
    const r = validateFileUpload('doc.pdf', 'application/pdf', 1024)
    expect(r.valid).toBe(true)
    expect(r.errors).toHaveLength(0)
  })

  it('passes a valid JPEG image', () => {
    const r = validateFileUpload('photo.jpg', 'image/jpeg', 500_000)
    expect(r.valid).toBe(true)
  })

  it('fails when file exceeds 5 MB', () => {
    const r = validateFileUpload('big.pdf', 'application/pdf', MAX_FILE_SIZE_BYTES + 1)
    expect(r.valid).toBe(false)
    expect(r.errors.some(e => /5 Mo/i.test(e))).toBe(true)
  })

  it('fails on wrong MIME type and accumulates the error', () => {
    const r = validateFileUpload('doc.pdf', 'image/gif', 1024)
    expect(r.valid).toBe(false)
    expect(r.errors.length).toBeGreaterThanOrEqual(1)
  })

  it('fails on wrong extension and accumulates the error', () => {
    const r = validateFileUpload('doc.docx', 'application/pdf', 1024)
    expect(r.valid).toBe(false)
    expect(r.errors.length).toBeGreaterThanOrEqual(1)
  })

  it('accumulates all errors when both MIME and extension are wrong', () => {
    const r = validateFileUpload('virus.exe', 'application/octet-stream', 100)
    expect(r.valid).toBe(false)
    expect(r.errors.length).toBeGreaterThanOrEqual(2)
  })

  it('reports size in MB in the error message', () => {
    const sixMb = 6 * 1024 * 1024
    const r = validateFileUpload('big.pdf', 'application/pdf', sixMb)
    expect(r.errors.some(e => e.includes('6.00 Mo'))).toBe(true)
  })
})
