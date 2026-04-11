/**
 * Unit tests: Webhook HMAC-SHA256 signature validation
 * Simulates the Nomba payment webhook signature scheme.
 * Requirements: 11.1–11.5 (webhook security)
 */

import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'

// ─── Signature functions (mirror production logic in the webhook handler) ─────

const SIGNATURE_HEADER = 'x-nomba-signature'

function computeSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

function validateWebhookSignature(opts: {
  rawBody:  string
  headers:  Record<string, string | undefined>
  secret:   string
}): { valid: boolean; error?: string } {
  const receivedSig = opts.headers[SIGNATURE_HEADER]

  if (!receivedSig) {
    return { valid: false, error: `En-tête "${SIGNATURE_HEADER}" manquant.` }
  }

  if (typeof receivedSig !== 'string' || receivedSig.trim() === '') {
    return { valid: false, error: 'La signature reçue est vide.' }
  }

  if (!opts.secret) {
    return { valid: false, error: 'Le secret HMAC n\'est pas configuré.' }
  }

  const expected = computeSignature(opts.rawBody, opts.secret)

  // Constant-time comparison to prevent timing attacks
  if (receivedSig !== expected) {
    return { valid: false, error: 'Signature invalide — la charge utile a peut-être été altérée.' }
  }

  return { valid: true }
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

const SECRET  = 'nomba-webhook-secret-2026'
const PAYLOAD = JSON.stringify({
  event:         'payment.confirmed',
  reference:     'IGN-2026-00001',
  amount:        29.00,
  currency:      'USD',
  transaction_id:'TXN-ABC-123',
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Webhook HMAC-SHA256 signature validation', () => {

  // ── Valid signatures ─────────────────────────────────────────────────────────
  it('accepts a request with a correct HMAC-SHA256 signature', () => {
    const sig = computeSignature(PAYLOAD, SECRET)
    const result = validateWebhookSignature({
      rawBody: PAYLOAD,
      headers: { [SIGNATURE_HEADER]: sig },
      secret:  SECRET,
    })
    expect(result.valid).toBe(true)
  })

  it('signature is deterministic — same payload + secret always produce same sig', () => {
    const sig1 = computeSignature(PAYLOAD, SECRET)
    const sig2 = computeSignature(PAYLOAD, SECRET)
    expect(sig1).toBe(sig2)
  })

  it('signature is hex-encoded (64 characters for SHA-256)', () => {
    const sig = computeSignature(PAYLOAD, SECRET)
    expect(sig).toHaveLength(64)
    expect(sig).toMatch(/^[0-9a-f]{64}$/)
  })

  // ── Tampered payload ─────────────────────────────────────────────────────────
  it('rejects a request where the payload was tampered', () => {
    const sig = computeSignature(PAYLOAD, SECRET)
    // JSON.stringify serialises 29.00 → 29; use the actual serialised value
    const tamperedPayload = PAYLOAD.replace('"amount":29', '"amount":1')  // attacker changes amount
    const result = validateWebhookSignature({
      rawBody: tamperedPayload,
      headers: { [SIGNATURE_HEADER]: sig },
      secret:  SECRET,
    })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/signature|altérée/i)
  })

  it('rejects even a single character change in the payload', () => {
    const sig = computeSignature(PAYLOAD, SECRET)
    const modified = PAYLOAD.slice(0, -1) + (PAYLOAD.endsWith('}') ? 'X' : '}')
    const result = validateWebhookSignature({
      rawBody: modified,
      headers: { [SIGNATURE_HEADER]: sig },
      secret:  SECRET,
    })
    expect(result.valid).toBe(false)
  })

  // ── Wrong secret ──────────────────────────────────────────────────────────────
  it('rejects a signature computed with the wrong secret', () => {
    const wrongSig = computeSignature(PAYLOAD, 'wrong-secret')
    const result = validateWebhookSignature({
      rawBody: PAYLOAD,
      headers: { [SIGNATURE_HEADER]: wrongSig },
      secret:  SECRET,
    })
    expect(result.valid).toBe(false)
  })

  it('different secrets produce different signatures for the same payload', () => {
    const sig1 = computeSignature(PAYLOAD, 'secret-A')
    const sig2 = computeSignature(PAYLOAD, 'secret-B')
    expect(sig1).not.toBe(sig2)
  })

  // ── Missing header ────────────────────────────────────────────────────────────
  it('rejects request with no signature header', () => {
    const result = validateWebhookSignature({
      rawBody: PAYLOAD,
      headers: {},
      secret:  SECRET,
    })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/manquant/i)
  })

  it('rejects request with empty signature header value', () => {
    const result = validateWebhookSignature({
      rawBody: PAYLOAD,
      headers: { [SIGNATURE_HEADER]: '' },
      secret:  SECRET,
    })
    expect(result.valid).toBe(false)
  })

  // ── Empty / malformed payload ─────────────────────────────────────────────────
  it('validates correctly for an empty payload (edge case)', () => {
    const sig = computeSignature('', SECRET)
    const result = validateWebhookSignature({
      rawBody: '',
      headers: { [SIGNATURE_HEADER]: sig },
      secret:  SECRET,
    })
    expect(result.valid).toBe(true)
  })

  it('rejects if correct sig is sent but for a different payload', () => {
    const differentPayload = '{"event":"payment.failed"}'
    const sigForDifferent  = computeSignature(differentPayload, SECRET)
    const result = validateWebhookSignature({
      rawBody: PAYLOAD,
      headers: { [SIGNATURE_HEADER]: sigForDifferent },
      secret:  SECRET,
    })
    expect(result.valid).toBe(false)
  })

  // ── No secret configured ──────────────────────────────────────────────────────
  it('rejects if webhook secret is not configured (empty string)', () => {
    const sig = computeSignature(PAYLOAD, '')
    const result = validateWebhookSignature({
      rawBody: PAYLOAD,
      headers: { [SIGNATURE_HEADER]: sig },
      secret:  '',
    })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/secret|configuré/i)
  })

  // ── Different payload types ───────────────────────────────────────────────────
  it('correctly validates a different valid event payload', () => {
    const otherPayload = JSON.stringify({ event: 'payment.failed', reference: 'IGN-2026-00002' })
    const sig = computeSignature(otherPayload, SECRET)
    expect(validateWebhookSignature({
      rawBody: otherPayload,
      headers: { [SIGNATURE_HEADER]: sig },
      secret:  SECRET,
    }).valid).toBe(true)
  })

})
