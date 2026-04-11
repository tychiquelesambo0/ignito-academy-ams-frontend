#!/bin/bash

# Script to apply USD Single-Currency Enforcement migration
# Task 7: Database Migration

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Applying Migration: USD Single-Currency Enforcement"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local not found"
    echo "Please create .env.local with your Supabase credentials"
    exit 1
fi

# Load environment variables
source .env.local

# Check if required variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: Missing Supabase credentials"
    echo "Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

echo "✅ Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "✅ Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
echo ""

# Extract project reference from URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -E 's/https:\/\/([^.]+).*/\1/')
echo "📋 Project Reference: $PROJECT_REF"
echo ""

# Read migration file
MIGRATION_FILE="supabase/migrations/20260411_usd_only_constraints.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Migration file: $MIGRATION_FILE"
echo ""

# Apply migration using Supabase REST API
echo "🚀 Applying migration..."
echo ""

RESPONSE=$(curl -s -X POST \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(jq -Rs . < "$MIGRATION_FILE")}")

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    echo ""
    echo "Response: $RESPONSE"
else
    echo "❌ Migration failed!"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Migration Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
