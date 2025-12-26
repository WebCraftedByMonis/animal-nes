import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createProductSaleTransaction, createAnimalSaleTransaction } from '@/lib/autoTransaction'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { 
    city, 
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
    // ✅ Always use the fixed shipping charge from frontend (e.g., 350)
    const validatedShippingCharge = shippingCharges

    // ✅ Recalculate subtotal server-side
    const calculatedSubtotal = 
      cart.reduce((sum: number, item: any) => sum + (item.quantity * item.variant.customerPrice), 0) +
      animalCart.reduce((sum: number, item: any) => sum + (item.quantity * item.animal.totalPrice), 0)

    // ✅ Recalculate total
    const calculatedTotal = calculatedSubtotal + validatedShippingCharge

    // ✅ Verify total matches (with float tolerance)
    if (Math.abs(calculatedTotal - total) > 0.01) {
      return NextResponse.json({ 
        error: 'Total mismatch. Please refresh and try again.' 
      }, { status: 400 })
    }

    // ✅ Create order
    const order = await prisma.checkout.create({
      data: {
        user: { connect: { email: session.user.email } },
        city,
        province,
        address,
        shippingAddress,
        paymentMethod,
        shipmentcharges: validatedShippingCharge.toString(),
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
                  purchasedPrice: item.variant.dealerPrice || item.variant.companyPrice || null,
                }
              }
              throw new Error('Unknown item type in cart')
            }),
            ...animalCart.map((item: any) => ({
              animal: { connect: { id: item.animal.id } },
              quantity: item.quantity,
              price: item.animal.totalPrice,
              purchasedPrice: item.animal.purchasePrice || null,
            }))
          ]
        }
      }
    })

    // ✅ Clear both product and animal cart items
    await prisma.cartItem.deleteMany({
      where: { user: { email: session.user.email } },
    })
    await prisma.animalCart.deleteMany({
      where: { user: { email: session.user.email } },
    })

    // ✅ Auto-create CNS transactions for each item sold with profit tracking
    // Fetch created order items to get their IDs
    const createdOrder = await prisma.checkout.findUnique({
      where: { id: order.id },
      include: { items: true }
    })

    if (createdOrder) {
      // Create transactions for products
      for (const item of cart) {
        if (item.product) {
          const createdItem = createdOrder.items.find(i => i.productId === item.product.id && i.variantId === item.variant.id)
          if (createdItem) {
            const productAmount = item.quantity * item.variant.customerPrice
            const purchasedPrice = item.variant.dealerPrice || item.variant.companyPrice || null

            await createProductSaleTransaction(
              order.id,
              createdItem.id,
              productAmount,
              purchasedPrice,
              `${item.product.productName} (${item.variant.packingVolume || 'N/A'})`,
              paymentMethod
            )
          }
        }
      }

      // Create transactions for animals
      for (const item of animalCart) {
        const createdItem = createdOrder.items.find(i => i.animalId === item.animal.id)
        if (createdItem) {
          const animalAmount = item.quantity * item.animal.totalPrice
          const purchasedPrice = item.animal.purchasePrice || null

          await createAnimalSaleTransaction(
            order.id,
            createdItem.id,
            animalAmount,
            purchasedPrice,
            `${item.animal.specie} - ${item.animal.breed}`,
            paymentMethod
          )
        }
      }
    }

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
