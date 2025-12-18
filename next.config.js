/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Erhöhe Upload-Limits auf 5MB
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
  webpack: (config, { isServer }) => {
    // Handle pdfjs-dist properly
    if (!isServer) {
      config.resolve.alias.canvas = false;
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;