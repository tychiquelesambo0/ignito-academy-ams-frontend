#!/bin/bash

# ============================================================================
# Check if Supabase Database is Clean
# ============================================================================

set -e

echo "🔍 Checking Supabase Database Status"
echo "====================================="
echo ""

# Prompt for project reference
read -p "Enter your Supabase Project Reference: " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Error: Project reference cannot be empty"
    exit 1
fi

echo ""
read -sp "Enter your database password: " DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Error: Database password cannot be empty"
    exit 1
fi

# Construct connection string
DB_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

echo ""
echo "🔗 Connecting to database..."
echo ""

# Check for existing tables
echo "📋 Checking for existing tables in public schema..."
echo ""

psql "$DB_URL" -c "
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
" 2>/dev/null

if [ $? -eq 0 ]; then
    echo ""
    echo "📊 Checking table count..."
    TABLE_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null | tr -d ' ')
    
    echo ""
    if [ "$TABLE_COUNT" -eq 0 ]; then
        echo "✅ Database is CLEAN - No tables found in public schema"
        echo "✅ Safe to proceed with migrations"
    else
        echo "⚠️  Database is NOT CLEAN - Found $TABLE_COUNT tables"
        echo ""
        echo "⚠️  WARNING: Your database contains existing tables from previous projects"
        echo ""
        echo "Options:"
        echo "1. Create a BRAND NEW Supabase project (recommended)"
        echo "2. Drop all existing tables (DESTRUCTIVE - will delete all data)"
        echo ""
        read -p "Do you want to see the cleanup script? (y/n): " SHOW_CLEANUP
        
        if [ "$SHOW_CLEANUP" = "y" ] || [ "$SHOW_CLEANUP" = "Y" ]; then
            echo ""
            echo "To clean the database, run this SQL in Supabase SQL Editor:"
            echo ""
            echo "-- WARNING: This deletes ALL data"
            echo "DROP SCHEMA public CASCADE;"
            echo "CREATE SCHEMA public;"
            echo "GRANT ALL ON SCHEMA public TO postgres;"
            echo "GRANT ALL ON SCHEMA public TO public;"
            echo ""
        fi
    fi
else
    echo "❌ Error: Could not connect to database"
    echo "Please check your project reference and password"
fi

echo ""
echo "🔍 Checking for storage buckets..."
echo ""

psql "$DB_URL" -c "SELECT id, name, public FROM storage.buckets;" 2>/dev/null

echo ""
echo "Done!"
