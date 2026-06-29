/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { optimizePackageImports: ['framer-motion'] },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}
module.exports = nextConfig
