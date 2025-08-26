// /api/cart/add/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { productId, variantId } = await req.json()

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    await prisma.cartItem.upsert({
  where: {
    userId_productId_variantId: {
      userId: user.id,
      productId,
      variantId,
    },
  },
  update: {
    quantity: { increment: 1 },
  },
  create: {
    userId: user.id,
    productId,
    variantId,
    quantity: 1,
  },
})

    return NextResponse.json({ message: 'Added to cart' }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
