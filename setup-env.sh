#!/bin/bash

# ============================================================================
# IGNITO ACADEMY AMS — Environment Setup Script
# ============================================================================
# This script helps you configure .env.local with your Supabase credentials
# ============================================================================

set -e

echo "🚀 Ignito Academy AMS - Environment Setup"
echo "=========================================="
echo ""
echo "This script will help you configure .env.local with your Supabase credentials."
echo ""

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local already exists"
    read -p "Do you want to overwrite it? (y/n): " OVERWRITE
    if [ "$OVERWRITE" != "y" ] && [ "$OVERWRITE" != "Y" ]; then
        echo "❌ Setup cancelled"
        exit 0
    fi
    echo ""
fi

# Collect Supabase credentials
echo "📋 Please enter your Supabase project credentials:"
echo "(You can find these in Supabase Dashboard → Project Settings → API)"
echo ""

read -p "Project URL (https://xxxxx.supabase.co): " SUPABASE_URL
read -p "Anon/Public Key (eyJhbG...): " SUPABASE_ANON_KEY
read -sp "Service Role Key (eyJhbG...): " SUPABASE_SERVICE_ROLE_KEY
echo ""
read -sp "Database Password: " DB_PASSWORD
echo ""

# Extract project reference from URL
PROJECT_REF=$(echo "$SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co|\1|')

# Construct database URL
DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

echo ""
echo "📝 Creating .env.local file..."

# Create .env.local
cat > .env.local << EOF
# =============================================================================
# IGNITO ACADEMY AMS — Local Development Environment Variables
# =============================================================================
# Generated: $(date)
# =============================================================================

# ─── Supabase Configuration ──────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
DATABASE_URL=${DATABASE_URL}

# ─── Application Configuration ───────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
INTAKE_YEAR=2026
APPLICATION_FEE_USD=29
MAX_SCHOLARSHIPS_PER_YEAR=20

# ─── Payment Provider Configuration ──────────────────────────────────────────
# Use 'mock' for development, 'pawapay' for production
PAYMENT_PROVIDER=mock

# Pawa Pay API Credentials (leave empty for mock mode)
PAWAPAY_API_KEY=
PAWAPAY_API_SECRET=
PAWAPAY_BASE_URL=https://api.sandbox.pawapay.io
PAWAPAY_WEBHOOK_SECRET=

# ─── Email Service (Resend) ──────────────────────────────────────────────────
RESEND_API_KEY=
FROM_EMAIL=admissions@ignitoacademy.com

# ─── PDF Generation Assets ───────────────────────────────────────────────────
PDF_LOGO_URL=
PDF_SIGNATURE_URL=
PDF_FOOTER_TEXT=Ignito Academy · Portail Admitta · Kinshasa, RDC

# =============================================================================
# CRITICAL ARCHITECTURAL CONSTRAINTS (Non-Negotiable)
# =============================================================================
# 1. USD Single-Currency: No CDF, no exchange rates
# 2. Keyword Ban: Prohibited keywords strictly forbidden
# 3. Supabase Auth ONLY: No manual password hashing (no bcrypt)
# 4. Video URLs Only: YouTube/Vimeo links, no video file uploads
# =============================================================================
EOF

echo "✅ .env.local created successfully!"
echo ""
echo "📋 Configuration Summary:"
echo "  - Supabase URL: ${SUPABASE_URL}"
echo "  - Project Reference: ${PROJECT_REF}"
echo "  - Payment Provider: mock (development mode)"
echo ""
echo "⚠️  IMPORTANT SECURITY REMINDERS:"
echo "  - .env.local is gitignored (never commit it)"
echo "  - Service Role Key is SECRET (never expose in browser)"
echo "  - Database password is stored in connection string"
echo ""
echo "🎉 Setup complete! You can now run migrations."
echo ""
echo "Next steps:"
echo "  1. Review .env.local to ensure all values are correct"
echo "  2. Run: ./run-migrations.sh"
echo ""
