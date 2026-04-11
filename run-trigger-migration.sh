#!/bin/bash

# Run the auto-create applicant profile trigger migration
# This migration creates a database trigger that automatically creates
# an applicant profile when a user signs up via Supabase Auth

echo "========================================="
echo "Running Trigger Migration"
echo "========================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found"
    echo "Please create .env.local with your Supabase credentials"
    exit 1
fi

# Source environment variables
source .env.local

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not found in .env.local"
    echo "Please add your Supabase database URL"
    echo ""
    echo "Format: postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"
    echo ""
    read -p "Enter your DATABASE_URL: " DATABASE_URL
fi

echo "📦 Running migration: 20260410000005_auto_create_applicant_profile.sql"
echo ""

# Run the migration using Node.js and pg library
node -e "
const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  connectionString: process.env.DATABASE_URL || '$DATABASE_URL'
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    const sql = fs.readFileSync('supabase/migrations/20260410000005_auto_create_applicant_profile.sql', 'utf8');
    
    await client.query(sql);
    console.log('✅ Migration executed successfully');
    console.log('');
    console.log('The trigger will now automatically create applicant profiles');
    console.log('when users sign up via Supabase Auth.');
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
"

echo ""
echo "========================================="
echo "Migration Complete!"
echo "========================================="
