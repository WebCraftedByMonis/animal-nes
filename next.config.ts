import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

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
    unoptimized: true,
  },
};

export default nextConfig;
