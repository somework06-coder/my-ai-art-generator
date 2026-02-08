import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server-side packages that should not be bundled
  serverExternalPackages: ['puppeteer', 'fluent-ffmpeg', '@ffmpeg-installer/ffmpeg'],

  // Enable server-side features for Puppeteer
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Empty turbopack config to silence warning
  turbopack: {},
};

export default nextConfig;
