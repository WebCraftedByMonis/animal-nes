import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
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
