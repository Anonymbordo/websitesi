/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Do NOT default to a localhost URL here — that bakes a local host into
    // production builds. Let Next/Vercel inject the variable when needed.
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  // Build optimizations
  typescript: {
    // Typescript hataları production build'i engellemez (gerekirse)
    ignoreBuildErrors: false,
  },
  // Timeout settings
  httpAgentOptions: {
    keepAlive: true,
  },
}

module.exports = nextConfig