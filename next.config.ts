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
    // Increase body size limits for email sending
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // API route configuration for larger request bodies
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },

  images: {
    unoptimized: true, // 🚀 Disable Next.js image optimizer
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
