import type { NextConfig } from 'next'

// On Vercel (or with NITRO_PRESET set) Nitro packages the server instead — see
// vite.config.ts — and there is no dist/ for the standalone step to copy.
const hosted = Boolean(process.env.VERCEL || process.env.NITRO_PRESET)

const nextConfig: NextConfig = {
  // `vite build` emits a self-hosting Node server at dist/standalone/server.js
  output: hosted ? undefined : 'standalone',
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=(), payment=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
