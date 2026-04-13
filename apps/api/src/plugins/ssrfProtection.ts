import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { URL } from 'url'

// SSRF Protection - Block internal network requests
const DANGEROUS_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
  'metadata.google',
  '169.254.169.254',  // AWS/GCP/Azure metadata
  'metadata.aws.internal',
]

const DANGEROUS_PROTOCOLS = ['file:', 'gopher:', 'ftp:', 'dict:']

async function ssrfProtectionPlugin(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Only check URLs in query/body that we use for fetching
    const urlToCheck = request.body?.url || request.query?.url
    
    if (!urlToCheck || typeof urlToCheck !== 'string') {
      return
    }

    try {
      const parsed = new URL(urlToCheck)
      
      // Check dangerous protocols
      if (DANGEROUS_PROTOCOLS.includes(parsed.protocol)) {
        fastify.log.warn(`Blocked dangerous protocol: ${parsed.protocol}`)
        return reply.status(400).send({
          error: 'Invalid URL',
          message: 'This URL scheme is not allowed'
        })
      }

      // Check internal/dangerous hosts
      const hostname = parsed.hostname.toLowerCase()
      const isDangerous = DANGEROUS_HOSTS.some(dangerous => 
        hostname === dangerous || hostname.endsWith(`.${dangerous}`)
      )

      if (isDangerous) {
        fastify.log.warn(`Blocked internal host: ${hostname}`)
        return reply.status(400).send({
          error: 'Invalid URL',
          message: 'Internal network addresses are not allowed'
        })
      }

      // Check for private IP ranges (RFC 1918)
      const ip = parsed.hostname
      if (isPrivateIP(ip)) {
        fastify.log.warn(`Blocked private IP: ${ip}`)
        return reply.status(400).send({
          error: 'Invalid URL',
          message: 'Private IP addresses are not allowed'
        })
      }

    } catch (e) {
      // Invalid URL format
      return reply.status(400).send({
        error: 'Invalid URL',
        message: 'URL format is invalid'
      })
    }
  })
}

function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges
  const privateRanges = [
    /^10\./,                                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,           // 172.16.0.0/12
    /^192\.168\./,                              // 192.168.0.0/16
    /^127\./,                                   // 127.0.0.0/8
    /^169\.254\./,                              // Link-local
    /^192\.0\.0\./,                             // IETF Protocol
    /^192\.0\.2\./,                             // TEST-NET-1
    /^198\.51\.100\./,                          // TEST-NET-2
    /^203\.0\.113\./,                           // TEST-NET-3
  ]
  
  return privateRanges.some(range => range.test(ip))
}

export default fp(ssrfProtectionPlugin, {
  name: 'ssrf-protection',
  fastify: '4.x'
})