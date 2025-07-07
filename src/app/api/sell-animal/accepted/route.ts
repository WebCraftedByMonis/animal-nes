import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const animals = await prisma.sellAnimal.findMany({
      where: { status: 'ACCEPTED' },
      include: {
        user: true,
        images: true,
        videos: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(animals)
  } catch (error) {
    console.error('GET accepted error', error)
    return NextResponse.json({ error: 'Failed to fetch accepted requests' }, { status: 500 })
  }
}
