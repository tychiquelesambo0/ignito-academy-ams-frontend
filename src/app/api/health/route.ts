/**
 * GET /api/health
 *
 * Public health-check endpoint used by:
 *   - Vercel uptime monitoring
 *   - External uptime services (UptimeRobot, Better Uptime, etc.)
 *   - CI pipeline smoke tests after deployment
 *
 * Returns HTTP 200 when all services are reachable, HTTP 503 otherwise.
 * The response is intentionally lightweight — no auth, no DB writes.
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Never cache — always reflects live system state
export const dynamic = 'force-dynamic'

interface ServiceStatus {
  status:  'ok' | 'error'
  latency: number
  error?:  string
}

interface HealthResponse {
  status:    'ok' | 'degraded'
  timestamp: string
  version:   string
  uptime:    number
  services: {
    database: ServiceStatus
  }
}

const startTime = Date.now()

export async function GET(): Promise<NextResponse> {
  const t0 = Date.now()

  // ── Database probe ──────────────────────────────────────────────────────────
  // Lightweight query: read a single row from a public, non-sensitive table.
  // Uses the admin client so RLS doesn't interfere with the health check.
  let dbStatus: ServiceStatus

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('applicants')
      .select('id', { count: 'exact', head: true })  // HEAD request, no data returned
      .limit(1)

    dbStatus = error
      ? { status: 'error', latency: Date.now() - t0, error: error.message }
      : { status: 'ok',    latency: Date.now() - t0 }
  } catch (err) {
    dbStatus = {
      status:  'error',
      latency: Date.now() - t0,
      error:   err instanceof Error ? err.message : 'Unknown error',
    }
  }

  const allOk  = dbStatus.status === 'ok'
  const body: HealthResponse = {
    status:    allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version:   process.env.npm_package_version ?? '0.1.0',
    uptime:    Math.floor((Date.now() - startTime) / 1000),
    services:  { database: dbStatus },
  }

  return NextResponse.json(body, { status: allOk ? 200 : 503 })
}
