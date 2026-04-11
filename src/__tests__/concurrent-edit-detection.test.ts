import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Property Test 29: Concurrent Edit Detection
 *
 * Validates: Requirements 11.2, 11.3
 *
 * Simulates two admissions officers attempting to update the same application
 * status simultaneously, mirroring the behaviour of the PostgreSQL
 * `update_application_status_with_version_check()` function.
 *
 * Core invariant:
 *   Given two officers that load the SAME application version N,
 *   whichever officer commits first will succeed (version increments to N+1),
 *   and the second officer's update MUST be rejected because their expected
 *   version (N) no longer matches the stored version (N+1).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

type ApplicationStatus =
  | 'Dossier Créé'
  | 'en_cours_devaluation'
  | 'Admission sous réserve'
  | 'Admission définitive'
  | 'Dossier refusé'

interface Application {
  applicant_id: string
  application_status: ApplicationStatus
  version: number
}

interface UpdateResult {
  success: boolean
  application: Application
}

// ─── Pure model of the Supabase RPC ──────────────────────────────────────────

/**
 * Pure-function replica of:
 *   update_application_status_with_version_check(
 *     p_applicant_id, p_new_status, p_expected_version
 *   )
 *
 * Returns { success: true, updated application } when the expected version
 * matches the stored version, and { success: false, unchanged application }
 * when there is a version mismatch (optimistic lock violation).
 */
function applyStatusUpdate(
  app: Application,
  newStatus: ApplicationStatus,
  expectedVersion: number,
): UpdateResult {
  // Version mismatch → concurrent edit detected → reject
  if (app.version !== expectedVersion) {
    return { success: false, application: app }
  }

  // Version matches → accept and increment
  return {
    success: true,
    application: {
      ...app,
      application_status: newStatus,
      version: app.version + 1,
    },
  }
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const applicantIdArb = fc
  .tuple(fc.integer({ min: 2025, max: 2030 }), fc.integer({ min: 1, max: 99999 }))
  .map(([year, seq]) => `IGN-${year}-${String(seq).padStart(5, '0')}`)

const statusArb = fc.constantFrom<ApplicationStatus>(
  'en_cours_devaluation',
  'Admission sous réserve',
  'Admission définitive',
  'Dossier refusé',
)

const versionArb = fc.integer({ min: 1, max: 100 })

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Property 29 — Concurrent Edit Detection', () => {

  /**
   * Core property: second officer is always rejected.
   *
   * Both officers read the application at the SAME version.
   * Officer A commits first → succeeds, version N → N+1.
   * Officer B then submits with the OLD version N → rejected.
   */
  it('rejects the second concurrent update on every iteration', () => {
    fc.assert(
      fc.property(
        applicantIdArb,
        versionArb,
        statusArb,
        statusArb,
        (applicantId, initialVersion, officerAStatus, officerBStatus) => {
          // Shared initial state both officers loaded
          const sharedApp: Application = {
            applicant_id: applicantId,
            application_status: 'Dossier Créé',
            version: initialVersion,
          }

          // Officer A commits first — success expected
          const resultA = applyStatusUpdate(sharedApp, officerAStatus, initialVersion)
          expect(resultA.success).toBe(true)
          expect(resultA.application.version).toBe(initialVersion + 1)
          expect(resultA.application.application_status).toBe(officerAStatus)

          // Officer B now submits using the SAME stale version — must be rejected
          const resultB = applyStatusUpdate(resultA.application, officerBStatus, initialVersion)
          expect(resultB.success).toBe(false)

          // The application must be unchanged after Officer B's rejected attempt
          expect(resultB.application.version).toBe(initialVersion + 1)
          expect(resultB.application.application_status).toBe(officerAStatus)
        },
      ),
      { numRuns: 200 },
    )
  })

  /**
   * Idempotency property: re-submitting the correct (fresh) version always succeeds.
   *
   * After Officer B refreshes the page they see version N+1; their update
   * must now succeed.
   */
  it('accepts the update after the officer refreshes to the current version', () => {
    fc.assert(
      fc.property(
        applicantIdArb,
        versionArb,
        statusArb,
        statusArb,
        (applicantId, initialVersion, officerAStatus, officerBStatus) => {
          const sharedApp: Application = {
            applicant_id: applicantId,
            application_status: 'Dossier Créé',
            version: initialVersion,
          }

          // Officer A commits
          const resultA = applyStatusUpdate(sharedApp, officerAStatus, initialVersion)
          expect(resultA.success).toBe(true)

          // Officer B refreshes → now uses the current version (N+1)
          const resultB = applyStatusUpdate(
            resultA.application,
            officerBStatus,
            resultA.application.version,
          )
          expect(resultB.success).toBe(true)
          expect(resultB.application.version).toBe(initialVersion + 2)
          expect(resultB.application.application_status).toBe(officerBStatus)
        },
      ),
      { numRuns: 200 },
    )
  })

  /**
   * Version monotonicity: every successful update strictly increments version.
   */
  it('increments the version by exactly 1 on every successful update', () => {
    fc.assert(
      fc.property(
        applicantIdArb,
        versionArb,
        statusArb,
        (applicantId, initialVersion, newStatus) => {
          const app: Application = {
            applicant_id: applicantId,
            application_status: 'Dossier Créé',
            version: initialVersion,
          }

          const result = applyStatusUpdate(app, newStatus, initialVersion)

          expect(result.success).toBe(true)
          expect(result.application.version).toBe(initialVersion + 1)
        },
      ),
      { numRuns: 200 },
    )
  })

  /**
   * Immutability on failure: a failed update must not alter any field.
   */
  it('leaves the application entirely unchanged when the version is stale', () => {
    fc.assert(
      fc.property(
        applicantIdArb,
        versionArb,
        statusArb,
        fc.integer({ min: 0, max: 50 }),
        (applicantId, currentVersion, newStatus, staleDelta) => {
          // staleDelta >= 0, so staleVersion is always strictly less than currentVersion
          // (to guarantee mismatch even when staleDelta === 0 we add 1 to currentVersion)
          const staleVersion = currentVersion
          const storedVersion = currentVersion + staleDelta + 1

          const app: Application = {
            applicant_id: applicantId,
            application_status: 'en_cours_devaluation',
            version: storedVersion,
          }

          const result = applyStatusUpdate(app, newStatus, staleVersion)

          expect(result.success).toBe(false)
          expect(result.application.version).toBe(storedVersion)
          expect(result.application.application_status).toBe('en_cours_devaluation')
          expect(result.application.applicant_id).toBe(applicantId)
        },
      ),
      { numRuns: 200 },
    )
  })

  /**
   * Chain of N sequential updates: version must equal initialVersion + N.
   */
  it('produces a version equal to initialVersion + N after N sequential updates', () => {
    fc.assert(
      fc.property(
        applicantIdArb,
        versionArb,
        fc.array(statusArb, { minLength: 1, maxLength: 20 }),
        (applicantId, initialVersion, statusChain) => {
          let app: Application = {
            applicant_id: applicantId,
            application_status: 'Dossier Créé',
            version: initialVersion,
          }

          statusChain.forEach(status => {
            const result = applyStatusUpdate(app, status, app.version)
            expect(result.success).toBe(true)
            app = result.application
          })

          expect(app.version).toBe(initialVersion + statusChain.length)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * No ghost writes: a rejected update must return the exact same object
   * reference state — applicant_id unchanged, status unchanged, version unchanged.
   */
  it('preserves applicant_id integrity through failed concurrent updates', () => {
    fc.assert(
      fc.property(
        applicantIdArb,
        fc.constantFrom<ApplicationStatus>(
          'en_cours_devaluation',
          'Admission sous réserve',
          'Admission définitive',
        ),
        versionArb,
        statusArb,
        (applicantId, existingStatus, version, attackerStatus) => {
          const app: Application = {
            applicant_id: applicantId,
            application_status: existingStatus,
            version,
          }

          // Try to update with wrong version (version - 1)
          const staleVersion = version - 1
          const result = applyStatusUpdate(app, attackerStatus, staleVersion)

          expect(result.success).toBe(false)
          expect(result.application.applicant_id).toBe(applicantId)
          expect(result.application.application_status).toBe(existingStatus)
          expect(result.application.version).toBe(version)
        },
      ),
      { numRuns: 200 },
    )
  })
})
