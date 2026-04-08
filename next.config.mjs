/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  // Proxy API calls to backend
  // In dev: localhost:3001
  // In production (Replit/Vercel): use environment variable or same-origin
  async rewrites() {
    const isProd = process.env.NODE_ENV === 'production'
    
    // For Replit production, use the backend URL if set
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || ''
    
    // If backend URL is explicitly set (including localhost for dev), use it
    if (backendUrl && backendUrl.includes('localhost')) {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3001/api/:path*',
        },
      ]
    }
    
    // Otherwise, assume same-origin (Fastify + Next.js on same domain in prod)
    // This works for Vercel where API routes are separate, or Replit with proper config
    return []
  },
}

export default nextConfig