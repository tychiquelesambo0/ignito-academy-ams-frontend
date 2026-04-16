/**
 * Structured JSON logger for Admitta AMS.
 *
 * Outputs newline-delimited JSON to stdout/stderr so that Vercel's log
 * ingestion pipeline can parse, filter, and forward entries to any
 * observability backend (Datadog, Axiom, Sentry, etc.) without code changes.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('webhook received',  { provider: 'pawapay', txId })
 *   logger.warn('rate limit hit',    { ip, endpoint })
 *   logger.error('db insert failed', { error: err.message, applicantId })
 *
 * To integrate Sentry:
 *   1. npm install @sentry/nextjs
 *   2. Add SENTRY_DSN to .env.local and Vercel environment variables
 *   3. Uncomment the Sentry.captureException() call in logger.error()
 *   4. Add sentry.client.config.ts, sentry.server.config.ts per Sentry docs
 */

type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level:     LogLevel
  message:   string
  service:   'admitta-ams'
  env:       string
  [key: string]: unknown
}

function write(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: 'admitta-ams',
    env: process.env.NODE_ENV ?? 'development',
    ...data,
  }

  const line = JSON.stringify(entry)

  if (level === 'error') {
    console.error(line)
    // ── Sentry integration (uncomment after adding @sentry/nextjs) ──
    // import * as Sentry from '@sentry/nextjs'
    // Sentry.captureMessage(message, { level: 'error', extra: data })
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export const logger = {
  info:  (message: string, data?: Record<string, unknown>) => write('info',  message, data),
  warn:  (message: string, data?: Record<string, unknown>) => write('warn',  message, data),
  error: (message: string, data?: Record<string, unknown>) => write('error', message, data),
}
