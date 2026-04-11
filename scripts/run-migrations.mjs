/**
 * Production migration runner.
 * Reads all SQL files from supabase/migrations/ in order and applies them
 * to the production Supabase database via the connection pooler.
 *
 * Usage: node scripts/run-migrations.mjs
 */

import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const { Client } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, '..')

// ─── Load env from .env.local ─────────────────────────────────────────────────
function loadEnv() {
  const envPath = join(ROOT, '.env.local')
  const lines   = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val    = trimmed.slice(eq + 1).trim()
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  }
}

loadEnv()

const PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL
  ?.replace('https://', '').replace('.supabase.co', '') ?? ''
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD ?? ''

// Try the Supabase connection pooler (avoids port 5432 firewall issues)
// Format: postgres.PROJECT_REF @ AWS pooler
const POOLER_REGIONS = [
  `aws-0-eu-west-1.pooler.supabase.com`,
  `aws-0-eu-central-1.pooler.supabase.com`,
  `aws-0-us-east-1.pooler.supabase.com`,
  `aws-0-us-west-1.pooler.supabase.com`,
]

async function tryConnect(host) {
  const client = new Client({
    host,
    port:     6543,
    database: 'postgres',
    user:     `postgres.${PROJECT_REF}`,
    password: DB_PASSWORD,
    ssl:      { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  })
  await client.connect()
  return client
}

async function main() {
  console.log(`\n🚀 Connecting to production Supabase (${PROJECT_REF})...`)

  let client = null
  for (const host of POOLER_REGIONS) {
    try {
      client = await tryConnect(host)
      console.log(`✅ Connected via ${host}`)
      break
    } catch (e) {
      console.log(`   ✗ ${host}: ${e.message}`)
    }
  }

  if (!client) {
    console.error('\n❌ Could not connect to any pooler endpoint.')
    process.exit(1)
  }

  // ─── Read migrations in order ─────────────────────────────────────────────
  const migrationsDir = join(ROOT, 'supabase', 'migrations')
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  console.log(`\n📋 Found ${files.length} migration files:\n`)
  files.forEach(f => console.log(`   ${f}`))
  console.log()

  // ─── Check which migrations are already applied ───────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
      version  TEXT PRIMARY KEY,
      inserted_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {
    // Table may be in a different schema or already exist — continue
  })

  let applied = new Set()
  try {
    const { rows } = await client.query(
      `SELECT version FROM supabase_migrations.schema_migrations`
    )
    applied = new Set(rows.map(r => r.version))
    console.log(`ℹ️  Already applied: ${applied.size} migration(s)`)
  } catch {
    console.log(`ℹ️  Migration tracking table not yet available — will apply all.`)
  }

  // ─── Apply each migration ─────────────────────────────────────────────────
  let successCount = 0
  let skipCount    = 0
  let errorCount   = 0

  for (const file of files) {
    const version = file.replace('.sql', '')

    if (applied.has(version)) {
      console.log(`⏭️  Skipping (already applied): ${file}`)
      skipCount++
      continue
    }

    const sql = readFileSync(join(migrationsDir, file), 'utf-8')
    process.stdout.write(`⚙️  Applying: ${file} ... `)

    try {
      await client.query('BEGIN')
      await client.query(sql)
      // Record the migration
      await client.query(
        `INSERT INTO supabase_migrations.schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING`,
        [version]
      ).catch(() => {}) // If tracking table is unavailable, continue anyway
      await client.query('COMMIT')
      console.log('✅')
      successCount++
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      console.log(`❌\n   Error: ${err.message}`)
      errorCount++
    }
  }

  await client.end()

  console.log(`\n──────────────────────────────────────`)
  console.log(`✅ Applied:  ${successCount}`)
  console.log(`⏭️  Skipped:  ${skipCount}`)
  console.log(`❌ Errors:   ${errorCount}`)
  console.log(`──────────────────────────────────────\n`)

  if (errorCount > 0) process.exit(1)
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
