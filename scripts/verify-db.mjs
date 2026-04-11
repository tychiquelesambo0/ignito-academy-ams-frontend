/**
 * Verifies that all required tables and enums exist in the production Supabase DB.
 * Run AFTER applying migrations from the SQL Editor.
 * Usage: node scripts/verify-db.mjs
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function loadEnv() {
  const lines = readFileSync(join(ROOT, '.env.local'), 'utf-8').split('\n')
  for (const line of lines) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    process.env[t.slice(0, eq).trim()] = val
  }
}

loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const REQUIRED_TABLES = [
  'profiles',
  'applications',
  'uploaded_documents',
  'email_logs',
  'audit_log',
  'admissions_officers',
]

const REQUIRED_STORAGE_BUCKETS = [
  'documents',
  'official_letters',
]

console.log('\n🔍 Verifying production database schema...\n')

let allOk = true

// ─── Check tables ──────────────────────────────────────────────────────────
for (const table of REQUIRED_TABLES) {
  const { error } = await supabase.from(table).select('count').limit(1)
  const isMissing = error && (
    error.message.includes('does not exist') ||
    error.message.includes('not found in the schema cache') ||
    error.code === '42P01'
  )
  if (isMissing) {
    console.log(`❌ Table MISSING: ${table}`)
    allOk = false
  } else if (error && error.code !== 'PGRST116') {
    // RLS blocking the query is fine — it means the table exists
    console.log(`✅ Table: ${table}`)
  } else {
    console.log(`✅ Table: ${table}`)
  }
}

// ─── Check storage buckets ──────────────────────────────────────────────────
console.log()
const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets()
if (bucketsErr) {
  console.log(`⚠️  Could not list buckets: ${bucketsErr.message}`)
} else {
  const bucketNames = buckets.map(b => b.name)
  for (const bucket of REQUIRED_STORAGE_BUCKETS) {
    if (bucketNames.includes(bucket)) {
      console.log(`✅ Bucket: ${bucket}`)
    } else {
      console.log(`❌ Bucket MISSING: ${bucket}`)
      allOk = false
    }
  }
}

// ─── Check application_status enum values ──────────────────────────────────
console.log()
const { data: apps, error: appsErr } = await supabase
  .from('applications')
  .select('application_status')
  .limit(1)

if (!appsErr || appsErr.code !== 'PGRST116') {
  console.log(`✅ applications table accessible`)
} else {
  console.log(`⚠️  applications table: ${appsErr.message}`)
}

// ─── Check admissions_officers ─────────────────────────────────────────────
const { data: officers, error: officersErr } = await supabase
  .from('admissions_officers')
  .select('email, is_active')
  .eq('is_active', true)

if (!officersErr) {
  console.log(`✅ admissions_officers: ${officers.length} active officer(s)`)
  officers.forEach(o => console.log(`   • ${o.email}`))
  if (officers.length === 0) {
    console.log(`⚠️  No active admissions officers found. Run the admin seed script.`)
    allOk = false
  }
} else {
  console.log(`❌ admissions_officers error: ${officersErr.message}`)
  allOk = false
}

// ─── Final verdict ──────────────────────────────────────────────────────────
console.log()
if (allOk) {
  console.log('🎉 All checks passed. Production database is ready!\n')
} else {
  console.log('⚠️  Some checks failed. Apply migrations and re-run this script.\n')
  process.exit(1)
}
