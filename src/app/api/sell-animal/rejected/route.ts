import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const animals = await prisma.sellAnimal.findMany({
      where: { status: 'REJECTED' },
      include: {
        user: true,
        images: true,
        videos: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(animals)
  } catch (error) {
    console.error('GET rejected error', error)
    return NextResponse.json({ error: 'Failed to fetch rejected requests' }, { status: 500 })
  }
}
