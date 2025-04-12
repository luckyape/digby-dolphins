/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  experimental: {
    serverActions: true,
  },
  async redirects() {
    return [
      {
        source: '/events',
        destination: '/calendar',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
