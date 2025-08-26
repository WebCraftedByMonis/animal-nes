import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const animals = await prisma.sellAnimal.findMany({
      where: {
        user: {
          email: session.user.email
        }
      },
      include: {
        user: true,
        images: true,
        videos: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      items: animals,
      total: animals.length,
    })

  } catch (error) {
    console.error('GET user sell requests error', error)
    return NextResponse.json(
      { error: 'Failed to fetch user sell requests' },
      { status: 500 }
    )
  }
}
