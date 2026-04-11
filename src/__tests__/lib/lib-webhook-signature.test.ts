/**
 * Coverage tests for src/lib/webhooks/signature.ts
 */
import { describe, it, expect } from 'vitest'
import {
  computeSignature,
  validateWebhookSignature,
  extractHexDigest,
} from '@/lib/webhooks/signature'

const SECRET  = 'test-webhook-secret'
const PAYLOAD = JSON.stringify({ event: 'payment.confirmed', amount: 29, currency: 'USD' })

describe('computeSignature', () => {
  it('returns a string starting with sha256=', () => {
    expect(computeSignature(PAYLOAD, SECRET)).toMatch(/^sha256=[a-f0-9]{64}$/)
  })

  it('is deterministic for the same inputs', () => {
    expect(computeSignature(PAYLOAD, SECRET)).toBe(computeSignature(PAYLOAD, SECRET))
  })

  it('produces different digests for different payloads', () => {
    const other = JSON.stringify({ event: 'payment.confirmed', amount: 1, currency: 'USD' })
    expect(computeSignature(PAYLOAD, SECRET)).not.toBe(computeSignature(other, SECRET))
  })

  it('produces different digests for different secrets', () => {
    expect(computeSignature(PAYLOAD, SECRET)).not.toBe(computeSignature(PAYLOAD, 'other-secret'))
  })
})

describe('validateWebhookSignature', () => {
  it('returns true for a correct signature', () => {
    const sig = computeSignature(PAYLOAD, SECRET)
    expect(validateWebhookSignature(PAYLOAD, SECRET, sig)).toBe(true)
  })

  it('returns false for a tampered payload', () => {
    const sig       = computeSignature(PAYLOAD, SECRET)
    const tampered  = PAYLOAD.replace('"amount":29', '"amount":1')
    expect(validateWebhookSignature(tampered, SECRET, sig)).toBe(false)
  })

  it('returns false for the wrong secret', () => {
    const sig = computeSignature(PAYLOAD, SECRET)
    expect(validateWebhookSignature(PAYLOAD, 'wrong-secret', sig)).toBe(false)
  })

  it('returns false for a null header', () => {
    expect(validateWebhookSignature(PAYLOAD, SECRET, null)).toBe(false)
  })

  it('returns false for an undefined header', () => {
    expect(validateWebhookSignature(PAYLOAD, SECRET, undefined)).toBe(false)
  })

  it('returns false for an empty header', () => {
    expect(validateWebhookSignature(PAYLOAD, SECRET, '')).toBe(false)
  })

  it('returns false for a malformed header (no sha256= prefix)', () => {
    const digest = computeSignature(PAYLOAD, SECRET).slice(7)  // strip 'sha256='
    expect(validateWebhookSignature(PAYLOAD, SECRET, digest)).toBe(false)
  })
})

describe('extractHexDigest', () => {
  it('extracts the hex digest from a valid header', () => {
    const sig    = computeSignature(PAYLOAD, SECRET)
    const digest = extractHexDigest(sig)
    expect(digest).toHaveLength(64)
    expect(digest).toMatch(/^[a-f0-9]{64}$/)
  })

  it('returns null for a header without sha256= prefix', () => {
    expect(extractHexDigest('invalidformat')).toBeNull()
  })

  it('returns null for a digest that is too short', () => {
    expect(extractHexDigest('sha256=abc123')).toBeNull()
  })

  it('lowercases the hex digest', () => {
    const digest = extractHexDigest('sha256=' + 'A'.repeat(64))
    expect(digest).toBe('a'.repeat(64))
  })
})
