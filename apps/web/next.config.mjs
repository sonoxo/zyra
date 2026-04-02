/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Disabled - API routes needed for Stripe/payments
  // For Replit: use SSR/ISR, not static export
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig