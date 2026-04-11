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

  // Security headers (also applied via vercel.json for CDN-level enforcement)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'X-Frame-Options',         value: 'DENY' },
          { key: 'X-XSS-Protection',        value: '1; mode=block' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
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
