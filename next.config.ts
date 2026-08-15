import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.animalwellness.shop' }],
        destination: 'https://animalwellness.shop/:path*',
        permanent: true,
      },
    ]
  },

eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    // Increase body size limits for server actions only
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },

  // Target modern browsers to reduce polyfills
  compiler: {
    // Strip console.log/info/debug in production, but keep console.error and
    // console.warn — otherwise diagnostic logging (and every existing
    // console.error in API routes) is silently dropped from prod builds too.
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // Optimize for modern browsers
  transpilePackages: [],

  images: {
    minimumCacheTTL: 31536000,
    formats: ['image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'animalwellness.shop' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
};

export default nextConfig;
