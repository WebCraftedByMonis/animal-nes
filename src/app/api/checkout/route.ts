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

  const { 
    city, 
    cityId,
    province, 
    address, 
    shippingAddress, 
    paymentMethod, 
    cart, 
    animalCart, 
    subtotal,
    shippingCharges,
    total 
  } = body

  try {
    // Validate that shipping charges match the selected city
    let validatedShippingCharge = 0
    if (cityId) {
      const deliveryCharge = await prisma.deliveryCharge.findFirst({
        where: { cityId: cityId }
      })
      
      if (deliveryCharge) {
        validatedShippingCharge = deliveryCharge.amount
        
        // Verify the shipping charge matches what was sent from frontend
        if (Math.abs(validatedShippingCharge - shippingCharges) > 0.01) {
          return NextResponse.json({ 
            error: 'Invalid shipping charges. Please refresh and try again.' 
          }, { status: 400 })
        }
      } else if (shippingCharges > 0) {
        // If no delivery charge found but frontend sent charges, something's wrong
        return NextResponse.json({ 
          error: 'Invalid shipping charges for selected city.' 
        }, { status: 400 })
      }
    }

    // Recalculate total on server side for security
    const calculatedSubtotal = 
      cart.reduce((sum: number, item: any) => sum + (item.quantity * item.variant.customerPrice), 0) +
      animalCart.reduce((sum: number, item: any) => sum + (item.quantity * item.animal.totalPrice), 0)
    
    const calculatedTotal = calculatedSubtotal + validatedShippingCharge

    // Verify the total matches (allowing small floating point differences)
    if (Math.abs(calculatedTotal - total) > 0.01) {
      return NextResponse.json({ 
        error: 'Total mismatch. Please refresh and try again.' 
      }, { status: 400 })
    }

    const order = await prisma.checkout.create({
      data: {
        user: { connect: { email: session.user.email } },
        city,
        province,
        address,
        shippingAddress,
        paymentMethod,
        shipmentcharges: validatedShippingCharge.toString(), // Store as string in shipmentcharges field
        total: calculatedTotal,
        status: 'pending',
        items: {
          create: [
            ...cart.map((item: any) => {
              if (item.product) {
                return {
                  product: { connect: { id: item.product.id } },
                  variant: { connect: { id: item.variant.id } },
                  quantity: item.quantity,
                  price: item.variant.customerPrice,
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

    return NextResponse.json({ 
      success: true, 
      orderId: order.id,
      total: calculatedTotal,
      shippingCharges: validatedShippingCharge
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to process order' }, { status: 500 })
  }
}