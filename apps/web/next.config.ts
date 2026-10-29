import { resolve } from 'node:path';
import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image; the root is the pnpm workspace.
  output: 'standalone',
  outputFileTracingRoot: resolve(__dirname, '../..'),
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
      { source: '/images/:path*', destination: `${API_URL}/images/:path*` },
    ];
  },
};

export default nextConfig;
