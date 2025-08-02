import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, quantity } = await req.json()

    // Validate ID
    if (!id || typeof id !== 'number') {
      return NextResponse.json(
        { message: 'Invalid cart item ID' },
        { status: 400 }
      )
    }

    // Validate quantity
    if (quantity === null || quantity === undefined) {
      return NextResponse.json(
        { message: 'Quantity is required' },
        { status: 400 }
      )
    }

    const parsedQuantity = parseInt(quantity)
    
    if (isNaN(parsedQuantity) || parsedQuantity < 1) {
      return NextResponse.json(
        { message: 'Quantity must be a positive number' },
        { status: 400 }
      )
    }

    // Update cart item
    await prisma.cartItem.update({
      where: { id },
      data: { quantity: parsedQuantity },
    })

    return NextResponse.json({ message: 'Quantity updated', quantity: parsedQuantity })
  } catch (error) {
    console.error('Error updating cart:', error)
    return NextResponse.json(
      { message: 'Error updating cart' },
      { status: 500 }
    )
  }
}