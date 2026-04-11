/**
 * Quick Resend connectivity test.
 * Sends a test email to verify the API key and FROM_EMAIL are configured correctly.
 * Usage: node scripts/test-resend.mjs
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Load .env.local
function loadEnv() {
  const lines = readFileSync(join(ROOT, '.env.local'), 'utf-8').split('\n')
  for (const line of lines) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    process.env[t.slice(0, eq).trim()] = val
  }
}

loadEnv()

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL     = process.env.FROM_EMAIL ?? 'admissions@ignitoacademy.cd'

if (!RESEND_API_KEY || RESEND_API_KEY.startsWith('re_PLACEHOLDER')) {
  console.error('❌ RESEND_API_KEY is not set in .env.local')
  process.exit(1)
}

console.log(`\n📧 Testing Resend...`)
console.log(`   API Key : ${RESEND_API_KEY.slice(0, 8)}...`)
console.log(`   From    : ${FROM_EMAIL}`)

// 1. Verify API key by listing domains
const domainsRes = await fetch('https://api.resend.com/domains', {
  headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
})

if (!domainsRes.ok) {
  const body = await domainsRes.text()
  console.error(`\n❌ Resend API key invalid or unauthorised.`)
  console.error(`   Status : ${domainsRes.status}`)
  console.error(`   Body   : ${body}`)
  process.exit(1)
}

const domains = await domainsRes.json()
console.log(`\n✅ Resend API key is valid.`)
console.log(`   Verified domains on this account:`)
if (domains.data?.length > 0) {
  domains.data.forEach(d => {
    console.log(`     • ${d.name} — status: ${d.status}`)
  })
} else {
  console.log(`     (no verified domains yet)`)
  console.log(`\n⚠️  You need to verify a domain in Resend before sending production emails.`)
  console.log(`   Steps:`)
  console.log(`     1. Go to https://resend.com/domains`)
  console.log(`     2. Click "Add Domain" → enter "ignitoacademy.cd"`)
  console.log(`     3. Add the DNS records Resend provides to your domain registrar`)
  console.log(`     4. Click "Verify" once DNS propagates (can take up to 48h)`)
  console.log(`     5. Update FROM_EMAIL=admissions@ignitoacademy.cd in .env.local`)
}

// 2. Check if the FROM_EMAIL domain is verified
const fromDomain = FROM_EMAIL.split('@')[1]
const isVerified = domains.data?.some(d => d.name === fromDomain && d.status === 'verified')

if (isVerified) {
  console.log(`\n✅ Domain "${fromDomain}" is verified. FROM_EMAIL is ready for production.`)
} else if (domains.data?.some(d => d.name === fromDomain)) {
  const d = domains.data.find(d => d.name === fromDomain)
  console.log(`\n⚠️  Domain "${fromDomain}" found but status: ${d.status}`)
  console.log(`   Check DNS records in Resend dashboard and wait for propagation.`)
} else {
  console.log(`\n⚠️  Domain "${fromDomain}" is not yet added to Resend.`)
  console.log(`   For development, Resend allows sending from "onboarding@resend.dev" (test mode only).`)
  console.log(`   For production: verify ignitoacademy.cd in the Resend dashboard.`)
}

console.log()
