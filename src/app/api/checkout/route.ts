import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createProductSaleTransaction, createAnimalSaleTransaction } from '@/lib/autoTransaction'

// Helper to get active discount for a product/variant
async function getActiveDiscountForItem(productId: number, variantId: number, companyId?: number): Promise<{ percentage: number } | null> {
  const now = new Date()

  // First check for variant-specific discount
  const variantDiscount = await prisma.discount.findFirst({
    where: {
      variantId: variantId,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now }
    },
    orderBy: { percentage: 'desc' }
  })

  if (variantDiscount) return { percentage: variantDiscount.percentage }

  // Then check for product-level discount
  const productDiscount = await prisma.discount.findFirst({
    where: {
      productId: productId,
      variantId: null,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now }
    },
    orderBy: { percentage: 'desc' }
  })

  if (productDiscount) return { percentage: productDiscount.percentage }

  // Finally check for company-level discount
  if (companyId) {
    const companyDiscount = await prisma.discount.findFirst({
      where: {
        companyId: companyId,
        productId: null,
        variantId: null,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      orderBy: { percentage: 'desc' }
    })

    if (companyDiscount) return { percentage: companyDiscount.percentage }
  }

  return null
}

// Calculate discounted price
function calculateDiscountedPrice(price: number, percentage: number): number {
  return Math.round((price - (price * percentage / 100)) * 100) / 100
}

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

    // ✅ Recalculate subtotal server-side with discounts applied
    let calculatedSubtotal = 0

    // Calculate product subtotal with discounts
    for (const item of cart) {
      const originalPrice = item.variant.customerPrice
      const companyId = item.product.companyId
      const discount = await getActiveDiscountForItem(item.product.id, item.variant.id, companyId)
      const finalPrice = discount ? calculateDiscountedPrice(originalPrice, discount.percentage) : originalPrice
      calculatedSubtotal += item.quantity * finalPrice
    }

    // Add animal cart items (no discounts on animals)
    calculatedSubtotal += animalCart.reduce((sum: number, item: any) => sum + (item.quantity * item.animal.totalPrice), 0)

    // ✅ Recalculate total
    const calculatedTotal = calculatedSubtotal + validatedShippingCharge

    // ✅ Verify total matches (with float tolerance - allow 1 PKR difference for rounding)
    if (Math.abs(calculatedTotal - total) > 1) {
      return NextResponse.json({
        error: 'Total mismatch. Please refresh and try again.'
      }, { status: 400 })
    }

    // ✅ Prepare cart items with discounted prices
    const cartItemsWithDiscounts = await Promise.all(
      cart.map(async (item: any) => {
        const originalPrice = item.variant.customerPrice
        const companyId = item.product.companyId
        const discount = await getActiveDiscountForItem(item.product.id, item.variant.id, companyId)
        const finalPrice = discount ? calculateDiscountedPrice(originalPrice, discount.percentage) : originalPrice
        return {
          ...item,
          originalPrice,
          finalPrice,
          discountPercentage: discount ? discount.percentage : null
        }
      })
    )

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
            ...cartItemsWithDiscounts.map((item: any) => {
              if (item.product) {
                return {
                  product: { connect: { id: item.product.id } },
                  variant: { connect: { id: item.variant.id } },
                  quantity: item.quantity,
                  price: item.finalPrice, // Use discounted price
                  originalPrice: item.originalPrice, // Store original price
                  discountPercentage: item.discountPercentage, // Store discount percentage
                  purchasedPrice: item.variant.dealerPrice || item.variant.companyPrice || null,
                }
              }
              throw new Error('Unknown item type in cart')
            }),
            ...animalCart.map((item: any) => ({
              animal: { connect: { id: item.animal.id } },
              quantity: item.quantity,
              price: item.animal.totalPrice,
              originalPrice: item.animal.totalPrice, // Animals don't have discounts
              discountPercentage: null,
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
      // Create transactions for products (use discounted prices)
      for (const item of cartItemsWithDiscounts) {
        if (item.product) {
          const createdItem = createdOrder.items.find(i => i.productId === item.product.id && i.variantId === item.variant.id)
          if (createdItem) {
            const productAmount = item.quantity * item.finalPrice // Use discounted price
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
