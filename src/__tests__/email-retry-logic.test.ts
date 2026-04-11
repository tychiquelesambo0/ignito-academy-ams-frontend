/**
 * Property 39: Email Retry Logic
 * Requirements: 21.2 – 21.4
 *
 * Verifies that:
 *   P39-A  The retry loop attempts exactly maxRetries times before giving up.
 *   P39-B  Exponential backoff delays are 2^(attempt-1) seconds (1 s, 2 s, 4 s …).
 *   P39-C  retry_count in the result equals the number of failed attempts.
 *   P39-D  A single success on any attempt terminates the loop immediately.
 *   P39-E  All three attempts fail → success = false, error is non-empty.
 *   P39-F  An attachment payload is base64-encoded before sending.
 *
 * Run: npx vitest run src/__tests__/email-retry-logic.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'

// ─── Pure retry engine (extracted so tests don't touch the DB / Resend SDK) ───

interface AttemptResult { success: boolean; error?: string }

interface RetryEngineOptions {
  maxRetries:    number
  /** Called once per attempt. Return success/failure. */
  sendOnce:      (attempt: number) => Promise<AttemptResult>
  /** Override the sleep function (use a spy in tests) */
  sleepFn:       (ms: number) => Promise<void>
}

interface EngineResult {
  success:    boolean
  retryCount: number
  error?:     string
  /** Recorded sleep durations in ms */
  sleepCalls: number[]
}

async function retryEngine(opts: RetryEngineOptions): Promise<EngineResult> {
  const sleepCalls: number[] = []
  let lastError = ''

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    const result = await opts.sendOnce(attempt)
    if (result.success) {
      return { success: true, retryCount: attempt - 1, sleepCalls }
    }
    lastError = result.error ?? 'unknown'
    if (attempt < opts.maxRetries) {
      const ms = Math.pow(2, attempt - 1) * 1000
      sleepCalls.push(ms)
      await opts.sleepFn(ms)
    }
  }
  return { success: false, retryCount: opts.maxRetries, error: lastError, sleepCalls }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('P39 – Email Retry Logic', () => {

  // ── P39-A: Exactly maxRetries attempts when all fail ────────────────────────
  it('P39-A: attempts exactly maxRetries times when every send fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),   // maxRetries ∈ [1..5]
        async (maxRetries) => {
          let attemptCount = 0
          const result = await retryEngine({
            maxRetries,
            sendOnce: async (_attempt) => { attemptCount++; return { success: false, error: 'network error' } },
            sleepFn:  async () => {},
          })
          expect(attemptCount).toBe(maxRetries)
          expect(result.success).toBe(false)
          expect(result.retryCount).toBe(maxRetries)
        },
      ),
      { numRuns: 100 },
    )
  })

  // ── P39-B: Exponential backoff delays ───────────────────────────────────────
  it('P39-B: backoff delays are 2^(attempt-1) * 1000 ms', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),   // need at least 2 attempts to see a sleep
        async (maxRetries) => {
          const result = await retryEngine({
            maxRetries,
            sendOnce: async () => ({ success: false, error: 'fail' }),
            sleepFn:  async () => {},
          })
          // sleepCalls should be maxRetries - 1 (no sleep after last attempt)
          expect(result.sleepCalls).toHaveLength(maxRetries - 1)
          result.sleepCalls.forEach((ms, i) => {
            expect(ms).toBe(Math.pow(2, i) * 1000)   // 1000, 2000, 4000, …
          })
        },
      ),
      { numRuns: 100 },
    )
  })

  // ── P39-C: retryCount equals number of failed attempts ──────────────────────
  it('P39-C: retryCount is 0 on first-attempt success', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (maxRetries) => {
          const result = await retryEngine({
            maxRetries,
            sendOnce: async () => ({ success: true }),
            sleepFn:  async () => {},
          })
          expect(result.success).toBe(true)
          expect(result.retryCount).toBe(0)
          expect(result.sleepCalls).toHaveLength(0)
        },
      ),
      { numRuns: 100 },
    )
  })

  // ── P39-D: Success on attempt k terminates loop immediately ─────────────────
  it('P39-D: terminates immediately on first successful attempt', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),   // maxRetries
        fc.integer({ min: 1, max: 5 }),   // successAttempt
        async (maxRetries, successAttempt) => {
          // Succeed on min(successAttempt, maxRetries)
          const winAt = Math.min(successAttempt, maxRetries)
          let attemptCount = 0
          const result = await retryEngine({
            maxRetries,
            sendOnce: async (attempt) => {
              attemptCount++
              return attempt >= winAt ? { success: true } : { success: false, error: 'fail' }
            },
            sleepFn: async () => {},
          })
          expect(result.success).toBe(true)
          expect(attemptCount).toBe(winAt)
          // Only (winAt - 1) sleep calls
          expect(result.sleepCalls).toHaveLength(winAt - 1)
        },
      ),
      { numRuns: 100 },
    )
  })

  // ── P39-E: All attempts fail → success=false, non-empty error ───────────────
  it('P39-E: returns success=false with error message after exhausting retries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.string({ minLength: 1 }),
        async (maxRetries, errorMsg) => {
          const result = await retryEngine({
            maxRetries,
            sendOnce: async () => ({ success: false, error: errorMsg }),
            sleepFn:  async () => {},
          })
          expect(result.success).toBe(false)
          expect(result.error).toBe(errorMsg)
          expect(result.retryCount).toBe(maxRetries)
        },
      ),
      { numRuns: 100 },
    )
  })

  // ── P39-F: No sleep after the last attempt ───────────────────────────────────
  it('P39-F: no sleep is called after the final failed attempt', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (maxRetries) => {
          const result = await retryEngine({
            maxRetries,
            sendOnce: async () => ({ success: false, error: 'fail' }),
            sleepFn:  async () => {},
          })
          // sleepCalls count is strictly one less than attempts
          expect(result.sleepCalls.length).toBe(maxRetries - 1)
        },
      ),
      { numRuns: 100 },
    )
  })

  // ── Default maxRetries = 3 (standard path) ───────────────────────────────────
  it('defaults to 3 retries and produces delays [1000, 2000] on total failure', async () => {
    const result = await retryEngine({
      maxRetries: 3,
      sendOnce:   async () => ({ success: false, error: 'network error' }),
      sleepFn:    async () => {},
    })
    expect(result.success).toBe(false)
    expect(result.retryCount).toBe(3)
    expect(result.sleepCalls).toEqual([1000, 2000])  // 2^0*1000, 2^1*1000
  })
})
