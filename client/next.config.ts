import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: '1700chess.vercel.app' }],
        destination: 'https://www.1700chess.sh/:path*',
        permanent: true,
      },
    ]
  },
  turbopack: {
    root: __dirname,
  },
  // Hide the dev-only Next.js indicator so it doesn't obscure UI in captures.
  devIndicators: false,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
