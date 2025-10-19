// /api/animal-cart/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()

  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const cartItems = await prisma.animalCart.findMany({
      where: { userId: user.id },
      include: {
        animal: {
          include: {
            images: true,
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    })

    return NextResponse.json({ cart: cartItems }, { status: 200 })
  } catch (error) {
    console.error('Error fetching animal cart:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
