import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { assetId, type } = await req.json()

  const scan = await prisma.scan.create({
    data: {
      type,
      status: 'RUNNING',
      orgId: session.user.orgId,
    },
  })

  // Simulate async scan (in production, this would be a background job)
  setTimeout(async () => {
    const score = Math.floor(Math.random() * 40) + 60 // 60-100
    await prisma.scan.update({
      where: { id: scan.id },
      data: {
        status: 'COMPLETED',
        score,
        results: {
          vulnerabilities: Math.floor(Math.random() * 10),
          openPorts: Math.floor(Math.random() * 5),
          sslIssues: Math.floor(Math.random() * 3),
        },
      },
    })
  }, 3000)

  return NextResponse.json(scan)
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scans = await prisma.scan.findMany({
    where: { orgId: session.user.orgId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json(scans)
}
