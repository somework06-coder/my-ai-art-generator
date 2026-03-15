import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Next.js uses SSG instead of SSR
  output: 'export',
  // Required to use Next.js Image component in SSG mode
  images: {
    unoptimized: true,
  },
  // Empty turbopack config to silence warning
  turbopack: {},
};

export default nextConfig;
