/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.oktacdn.com',
      },
      {
        protocol: 'https',
        hostname: '*.okta.com',
      },
    ],
  },
}

module.exports = nextConfig
