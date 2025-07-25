import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const { city, province, address, shippingAddress, paymentMethod, cart, animalCart, total } = body


  try {
    const order = await prisma.checkout.create({
      data: {
        user: { connect: { email: session.user.email } },
        city,
        province,
        address,
        shippingAddress,
        paymentMethod,
        total,
        status: 'pending',
        items: {
          create: [
            ...cart.map((item: any) => {
              if (item.product) {
                return {
                  product: { connect: { id: item.product.id } },
                  variant: { connect: { id: item.variant.id } },// Add this if your schema supports it
                  quantity: item.quantity,
                  price: item.variant.customerPrice, // Changed from item.product.customerPrice
                }
              } else {
                throw new Error('Unknown item type in cart');
              }
            }),
            ...animalCart.map((item: any) => {
              return {
                animal: { connect: { id: item.animal.id } },
                quantity: item.quantity,
                price: item.animal.totalPrice,
              }
            })

          ]
        }
      }
    })

    // Clear both product and animal cart items
    await prisma.cartItem.deleteMany({
      where: { user: { email: session.user.email } },
    })

    await prisma.animalCart.deleteMany({
      where: { user: { email: session.user.email } },
    })

    return NextResponse.json({ success: true, orderId: order.id })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to process order' }, { status: 500 })
  }
}
