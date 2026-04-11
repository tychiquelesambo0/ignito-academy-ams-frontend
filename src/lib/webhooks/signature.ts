/**
 * Webhook HMAC-SHA256 signature validation utilities.
 *
 * The signature is sent by the payment gateway in the X-Nomba-Signature header.
 * Format: sha256=<hex-digest>
 *
 * Verification steps:
 *   1. Compute HMAC-SHA256 of the raw request body using the webhook secret
 *   2. Compare the computed signature with the header value using a timing-safe comparison
 */

import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Computes an HMAC-SHA256 signature for the given payload.
 * Returns the hex-encoded digest prefixed with "sha256=".
 */
export function computeSignature(payload: string, secret: string): string {
  const digest = createHmac('sha256', secret).update(payload).digest('hex')
  return `sha256=${digest}`
}

/**
 * Validates a webhook signature from the request header.
 *
 * @param payload   - Raw (string) request body
 * @param secret    - Webhook secret shared with the payment provider
 * @param header    - Value of the X-Nomba-Signature header
 * @returns true if the signature is valid; false otherwise
 */
export function validateWebhookSignature(
  payload: string,
  secret:  string,
  header:  string | null | undefined,
): boolean {
  if (!header) return false

  const expected = computeSignature(payload, secret)

  try {
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(header,   'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/**
 * Extracts the raw hex digest from a "sha256=<hex>" header value.
 * Returns null if the format is invalid.
 */
export function extractHexDigest(header: string): string | null {
  const m = header.match(/^sha256=([a-f0-9]{64})$/i)
  return m ? m[1].toLowerCase() : null
}
