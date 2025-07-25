import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const animal = await prisma.sellAnimal.findUnique({
      where: { id },
      include: {
        user: true,
        images: true,
        videos: true,
      },
    })

    if (!animal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }

    return NextResponse.json(animal, { status: 200 })
  } catch (error) {
    console.error('GET animal by id error', error)
    return NextResponse.json({ error: 'Failed to fetch animal detail' }, { status: 500 })
  }
}
