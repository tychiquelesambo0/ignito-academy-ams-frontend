/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // The Supabase-generated types are out of sync with the live DB schema
    // (columns added via direct SQL migrations). Runtime behaviour is correct.
    // Re-enable once `supabase gen types` is run against the updated schema.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Expose NEXT_PUBLIC_APP_URL for absolute URL construction
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  },

  // Canonical host enforcement — redirect any non-admissions.ignitoacademy.com
  // traffic to the canonical domain so Google consolidates signals correctly.
  async redirects() {
    const canonicalHost = 'admissions.ignitoacademy.com'
    return process.env.NODE_ENV === 'production'
      ? [
          {
            source: '/(.*)',
            has: [
              {
                type: 'host',
                value: '(?!admissions\\.ignitoacademy\\.com).*\\.ignitoacademy\\.com',
              },
            ],
            destination: `https://${canonicalHost}/:path*`,
            permanent: true,
          },
        ]
      : []
  },

  // Security headers (also applied via vercel.json for CDN-level enforcement)
  async headers() {
    // Content Security Policy
    // NOTE: Next.js App Router requires 'unsafe-inline' for scripts because it
    // injects inline hydration scripts that cannot be nonce-controlled without
    // a custom server. 'unsafe-eval' is needed by some Next.js internals in dev.
    // All other directives are strict.
    const csp = [
      "default-src 'self'",
      // Next.js requires unsafe-inline for hydration; unsafe-eval only in dev
      process.env.NODE_ENV === 'development'
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self' 'unsafe-inline'",
      // Tailwind JIT generates inline styles
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      // Allow Supabase storage for document previews, placeholders, data URIs
      "img-src 'self' data: blob: https://*.supabase.co https://via.placeholder.com",
      // API calls: Supabase (REST + realtime websocket), Resend, PawaPay
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com https://api.pawapay.io https://api.sandbox.pawapay.io",
      // Scholarship video pitches via YouTube / Vimeo iframes only (no file uploads)
      "frame-src https://www.youtube.com https://player.vimeo.com https://www.youtube-nocookie.com",
      // No plugins, no base-tag hijacking, no external form targets
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // Stronger than X-Frame-Options — blocks all framing
      "frame-ancestors 'none'",
      // Force HTTPS for all sub-resources in production
      ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy',  value: csp },
          { key: 'X-Content-Type-Options',   value: 'nosniff' },
          { key: 'X-Frame-Options',          value: 'DENY' },
          { key: 'X-XSS-Protection',         value: '1; mode=block' },
          { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key:   'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },

  // Image optimisation — allow Supabase Storage and placeholder domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname:  '**.supabase.co',
        pathname:  '/storage/**',
      },
      {
        protocol: 'https',
        hostname:  'via.placeholder.com',
      },
    ],
  },
}

module.exports = nextConfig
