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
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
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
