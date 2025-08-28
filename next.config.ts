import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // 🔧 Disable React Strict Mode

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
