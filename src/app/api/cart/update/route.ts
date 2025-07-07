import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { id, quantity } = await req.json()

  try {
    await prisma.cartItem.update({
      where: { id },
      data: { quantity },
    })

    return NextResponse.json({ message: 'Quantity updated' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Error updating cart' }, { status: 500 })
  }
}
