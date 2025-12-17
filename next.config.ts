import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

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
    unoptimized: true, // Keep this for Cloudinary free plan to avoid bandwidth limits
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "**",
      },
    ],
  },
};

export default nextConfig;
