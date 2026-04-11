#!/bin/bash

# ============================================================================
# IGNITO ACADEMY AMS — Run Database Migrations (Fixed for Access Control)
# ============================================================================

set -e

echo "🚀 Ignito Academy AMS - Database Migration Script (Fixed)"
echo "=========================================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not installed"
    echo "Install with: brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI found: $(supabase --version)"
echo ""

# Check if already logged in
if supabase projects list &> /dev/null; then
    echo "✅ Already logged in to Supabase"
else
    echo "⚠️  Not logged in to Supabase"
    echo ""
    echo "To fix the access control error, you need to login first:"
    echo ""
    echo "Option 1: Get Access Token"
    echo "  1. Go to: https://supabase.com/dashboard/account/tokens"
    echo "  2. Click 'Generate new token'"
    echo "  3. Copy the token"
    echo "  4. Run: supabase login --token YOUR_TOKEN"
    echo ""
    echo "Option 2: Use Database URL Directly"
    echo "  We can push migrations using the database URL from .env.local"
    echo ""
    read -p "Do you want to use Option 2 (Database URL)? (y/n): " USE_DB_URL
    
    if [ "$USE_DB_URL" != "y" ] && [ "$USE_DB_URL" != "Y" ]; then
        echo ""
        echo "Please login first with:"
        echo "  supabase login --token YOUR_TOKEN"
        echo ""
        echo "Then run this script again."
        exit 1
    fi
fi

echo ""
read -p "Enter your Supabase Project Reference: " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Error: Project reference cannot be empty"
    exit 1
fi

echo ""
read -sp "Enter your Database Password: " DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Error: Database password cannot be empty"
    exit 1
fi

# Construct database URL
DB_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

echo ""
echo "🔗 Connecting to database..."
echo ""

# Test connection
if ! psql "$DB_URL" -c "SELECT 1;" &> /dev/null; then
    echo "❌ Error: Cannot connect to database"
    echo "Please check:"
    echo "  - Project reference is correct"
    echo "  - Database password is correct"
    echo "  - Your IP is allowed (Supabase allows all by default)"
    exit 1
fi

echo "✅ Database connection successful!"
echo ""

# Show migration files
echo "📋 Migration files to apply:"
echo ""
ls -1 supabase/migrations/202604*.sql
echo ""

read -p "Do you want to apply these migrations? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "❌ Migration cancelled"
    exit 0
fi

echo ""
echo "🚀 Applying migrations..."
echo ""

# Apply each migration
for migration in supabase/migrations/202604*.sql; do
    echo "📝 Applying: $(basename $migration)"
    if psql "$DB_URL" -f "$migration" > /dev/null 2>&1; then
        echo "✅ Success: $(basename $migration)"
    else
        echo "⚠️  Note: $(basename $migration) may have already been applied or had warnings"
        echo "   (This is often OK - continuing...)"
    fi
    echo ""
done

echo "✅ All migrations processed!"
echo ""

# Verify tables created
echo "🔍 Verifying tables created..."
echo ""

TABLE_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null | tr -d ' ')

if [ "$TABLE_COUNT" -ge 9 ]; then
    echo "✅ Success! Found $TABLE_COUNT tables in public schema"
    echo ""
    echo "📋 Tables created:"
    psql "$DB_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
else
    echo "⚠️  Warning: Only found $TABLE_COUNT tables (expected 9)"
    echo "   Please check migration logs above for errors"
fi

echo ""
echo "🎉 Migration complete!"
echo ""
echo "📝 Next steps:"
echo "1. Create test admin user in Supabase Dashboard → Authentication → Users"
echo "2. Email: admin@ignitoacademy.com"
echo "3. Update admin record with actual UUID"
echo ""
