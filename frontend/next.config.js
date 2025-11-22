/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  },
  experimental: {
    turbo: {
      root: __dirname,
    },
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
  // Vercel deployment optimizations
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  // Build optimizations
  typescript: {
    // Typescript hataları production build'i engellemez (gerekirse)
    ignoreBuildErrors: false,
  },
  eslint: {
    // ESLint hataları production build'i engellemez (gerekirse)
    ignoreDuringBuilds: false,
  },
  // Timeout settings
  httpAgentOptions: {
    keepAlive: true,
  },
}

module.exports = nextConfig