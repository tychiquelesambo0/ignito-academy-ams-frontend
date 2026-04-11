/**
 * Seeds the production admin (admissions officer) account.
 * Creates the Supabase Auth user and inserts the admissions_officers record.
 * Usage: node scripts/seed-admin.mjs
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

const ADMIN_EMAIL    = 'admin@ignitoacademy.com'
const ADMIN_PASSWORD = 'IgnitoAdmin2026#'
const ADMIN_NAME     = 'Tychique Lesambo'

console.log('\n👤 Seeding production admin account...\n')
console.log(`   Email    : ${ADMIN_EMAIL}`)
console.log(`   Password : ${ADMIN_PASSWORD}`)
console.log()

// Step 1: Check if auth user already exists
const { data: existingUsers } = await supabase.auth.admin.listUsers()
const existing = existingUsers?.users?.find(u => u.email === ADMIN_EMAIL)

let userId

if (existing) {
  console.log(`ℹ️  Auth user already exists: ${existing.id}`)
  userId = existing.id

  // Reset password in case it changed
  const { error: pwErr } = await supabase.auth.admin.updateUserById(userId, {
    password: ADMIN_PASSWORD,
  })
  if (pwErr) console.log(`⚠️  Could not reset password: ${pwErr.message}`)
  else console.log(`✅ Password reset to: ${ADMIN_PASSWORD}`)

} else {
  // Step 2: Create the auth user
  const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
    email:             ADMIN_EMAIL,
    password:          ADMIN_PASSWORD,
    email_confirm:     true,
    user_metadata:     { full_name: ADMIN_NAME, role: 'admissions_officer' },
  })

  if (createErr) {
    console.error(`❌ Failed to create auth user: ${createErr.message}`)
    process.exit(1)
  }

  userId = newUser.user.id
  console.log(`✅ Auth user created: ${userId}`)
}

// Step 3: Upsert into admissions_officers table
// The `id` column must equal the auth user UUID so RLS `.eq('id', auth.uid())` works.
const { error: officerErr } = await supabase
  .from('admissions_officers')
  .upsert({
    id:            userId,
    email:         ADMIN_EMAIL,
    password_hash: 'managed_by_supabase_auth',
    prenom:        'Tychique',
    nom:           'Lesambo',
    role:          'admissions_officer',
    is_active:     true,
  }, { onConflict: 'id' })

if (officerErr) {
  console.error(`❌ Failed to insert admissions_officers record: ${officerErr.message}`)
  process.exit(1)
}

console.log(`✅ admissions_officers record upserted.`)

// Step 4: Final verification
const { data: officers, error: checkErr } = await supabase
  .from('admissions_officers')
  .select('email, prenom, nom, is_active')
  .eq('is_active', true)

if (!checkErr && officers.length > 0) {
  console.log(`\n🎉 Admin account is ready!\n`)
  console.log(`   ┌─────────────────────────────────────────┐`)
  console.log(`   │  Admin Portal Login                     │`)
  console.log(`   │  URL      : /admin/login                │`)
  console.log(`   │  Email    : ${ADMIN_EMAIL.padEnd(27)} │`)
  console.log(`   │  Password : ${ADMIN_PASSWORD.padEnd(27)} │`)
  console.log(`   └─────────────────────────────────────────┘`)
  console.log()
} else {
  console.error(`❌ Verification failed: ${checkErr?.message}`)
  process.exit(1)
}
