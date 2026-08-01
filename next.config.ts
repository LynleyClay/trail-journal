import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    localPatterns: [{ pathname: '/photos/**' }],
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.dev', pathname: '/photos/**' },
    ],
  },
};

export default nextConfig;
