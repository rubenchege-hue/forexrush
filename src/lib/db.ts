import { PrismaClient } from '@prisma/client'

function createPrismaClient() {
  return new PrismaClient({
    log: ['query'],
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Always create a fresh client in development to pick up schema changes
export const db = createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db