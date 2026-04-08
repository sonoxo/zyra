// Prisma client - using dynamic import to avoid type errors when Prisma not generated
let prismaInstance: any = null
let prismaPromise: Promise<any> | null = null

async function getPrismaClient() {
  if (prismaInstance) return prismaInstance
  if (!prismaPromise) {
    prismaPromise = (async () => {
      try {
        // Try to load from node_modules directly
        const path = await import('path')
        const { fileURLToPath } = await import('url')
        const dir = path.dirname(fileURLToPath(import.meta.url))
        const prismaPath = path.resolve(dir, '../../node_modules/.prisma/client/index.js')
        
        const prisma = await import(prismaPath).catch(() => null)
        if (prisma && prisma.PrismaClient) {
          prismaInstance = new prisma.PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
          })
          return prismaInstance
        }
        throw new Error('Prisma client not found')
      } catch (error) {
        console.warn('[Prisma] Client not available')
        return null
      }
    })()
  }
  return prismaPromise
}

// Export a proxy that lazily initializes and awaits properly
export const prisma: any = new Proxy({} as any, {
  get(_target, prop) {
    return new Proxy(function() {}, {
      get(_t, method) {
        return async (...args: any[]) => {
          const client = await getPrismaClient()
          if (!client) throw new Error('Prisma client not available')
          const model = client[prop]
          if (!model) return null
          const modelMethod = model[method]
          if (typeof modelMethod === 'function') {
            return await modelMethod.apply(model, args)
          }
          return modelMethod
        }
      }
    })
  }
})