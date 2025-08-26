import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await req.json()

  try {
    await prisma.cartItem.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Item removed' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Error removing item' }, { status: 500 })
  }
}
