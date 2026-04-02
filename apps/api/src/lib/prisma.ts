// Prisma client - using dynamic import to avoid type errors when Prisma not generated
let prismaInstance: any = null

async function getPrismaClient() {
  if (prismaInstance) return prismaInstance
  
  try {
    const { PrismaClient } = await import('@prisma/client')
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
    return prismaInstance
  } catch (error) {
    console.warn('[Prisma] Client not available - running without DB')
    // Return a mock for development without DB
    return {
      user: { findUnique: () => null, findMany: () => [], create: () => null, update: () => null, delete: () => null, count: () => 0 },
      organization: { findUnique: () => null, findMany: () => [], create: () => null, update: () => null, delete: () => null, count: () => 0 },
      scan: { findUnique: () => null, findMany: () => [], create: () => null, update: () => null, count: () => 0, groupBy: () => [] },
      asset: { findUnique: () => null, findMany: () => [], create: () => null, update: () => null, delete: () => null },
      job: { findUnique: () => null, findMany: () => [], create: () => null, update: () => null, delete: () => null },
      threat: { findMany: () => [], create: () => null },
      incident: { findMany: () => [], create: () => null },
      activity: { findMany: () => [], create: () => null, groupBy: () => [] },
      webhook: { findMany: () => [], create: () => null, delete: () => null },
      auditLog: { findMany: () => [], create: () => null },
      organizationUser: { findFirst: () => null, findMany: () => [], create: () => null, update: () => null, delete: () => null },
      $connect: async () => {},
      $disconnect: async () => {},
    }
  }
}

// Export a proxy that lazily initializes
export const prisma = new Proxy({} as any, {
  get(_target, prop) {
    return async (...args: any[]) => {
      const client = await getPrismaClient()
      return (client as any)[prop](...args)
    }
  },
  apply(_target, _thisArg, args) {
    return async (...args: any[]) => {
      const client = await getPrismaClient()
      return (client as any)(...args)
    }
  }
})