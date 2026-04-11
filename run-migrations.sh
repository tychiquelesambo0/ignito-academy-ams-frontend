#!/bin/bash

# ============================================================================
# IGNITO ACADEMY AMS — Run Database Migrations
# ============================================================================
# This script links your Supabase CLI to the remote project and runs migrations
# ============================================================================

set -e  # Exit on error

echo "🚀 Ignito Academy AMS - Database Migration Script"
echo "=================================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not installed"
    echo "Install with: brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI found: $(supabase --version)"
echo ""

# Prompt for project reference
read -p "Enter your Supabase Project Reference (from Dashboard → Settings → General): " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Error: Project reference cannot be empty"
    exit 1
fi

echo ""
echo "🔗 Linking to Supabase project: $PROJECT_REF"
echo ""

# Link to project
supabase link --project-ref "$PROJECT_REF"

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to link to Supabase project"
    exit 1
fi

echo ""
echo "✅ Successfully linked to project"
echo ""

# Show migration status
echo "📋 Checking migration status..."
echo ""
supabase migration list

echo ""
read -p "Do you want to push all migrations to the remote database? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "❌ Migration cancelled"
    exit 0
fi

echo ""
echo "🚀 Pushing migrations to remote database..."
echo ""

# Push migrations
supabase db push

if [ $? -ne 0 ]; then
    echo "❌ Error: Migration failed"
    exit 1
fi

echo ""
echo "✅ Migrations completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Create test admin user in Supabase Dashboard → Authentication → Users"
echo "2. Email: admin@ignitoacademy.com"
echo "3. Update admin record with actual UUID (see MIGRATION_GUIDE.md)"
echo ""
echo "🎉 Database setup complete!"
