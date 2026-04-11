/**
 * Run the auto-create applicant profile trigger migration
 * This creates a database trigger that automatically creates applicant profiles
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('=========================================')
  console.log('Running Trigger Migration')
  console.log('=========================================')
  console.log('')

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260410000005_auto_create_applicant_profile.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')

    console.log('📦 Executing migration: 20260410000005_auto_create_applicant_profile.sql')
    console.log('')

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // Try direct execution if rpc doesn't work
      console.log('⚠️  RPC method not available, trying direct execution...')
      
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        const { error: execError } = await supabase.rpc('exec', { sql: statement })
        if (execError) {
          console.error('❌ Error executing statement:', execError.message)
          throw execError
        }
      }
    }

    console.log('✅ Migration executed successfully!')
    console.log('')
    console.log('The database trigger is now active:')
    console.log('  - Function: handle_new_user()')
    console.log('  - Trigger: on_auth_user_created')
    console.log('')
    console.log('When a user signs up via Supabase Auth, the trigger will')
    console.log('automatically create their applicant profile using the')
    console.log('metadata (prenom, nom, phone_number, date_naissance).')
    console.log('')
    console.log('=========================================')
    console.log('Migration Complete!')
    console.log('=========================================')

  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    console.error('')
    console.error('Please run this SQL manually in your Supabase SQL Editor:')
    console.error('')
    console.error('File: supabase/migrations/20260410000005_auto_create_applicant_profile.sql')
    process.exit(1)
  }
}

runMigration()
