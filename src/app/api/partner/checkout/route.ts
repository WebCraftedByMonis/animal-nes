import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { validatePartnerSession } from '@/lib/auth/partner-auth'
import { getActiveDiscountForItem, calculateDiscountedPrice } from '@/lib/discount-utils'
import { uploadImage } from '@/lib/cloudinary'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('partner-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const partner = await validatePartnerSession(token)
    if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const ordersJson = formData.get('orders') as string

    if (!ordersJson) {
      return NextResponse.json({ error: 'Orders data is required' }, { status: 400 })
    }

    const orders = JSON.parse(ordersJson) as {
      companyId: number;
      paymentMethod: string;
      screenshotKey?: string;
      city: string;
      province: string;
      address: string;
      shippingAddress: string;
    }[]

    // Get cart items
    const cartItems = await prisma.partnerCartItem.findMany({
      where: { partnerId: partner.id },
      include: {
        product: { include: { company: true } },
        variant: true,
      },
    })

    if (cartItems.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Group cart items by company
    const cartByCompany = new Map<number, typeof cartItems>()
    cartItems.forEach(item => {
      const companyId = item.product.companyId
      if (!cartByCompany.has(companyId)) cartByCompany.set(companyId, [])
      cartByCompany.get(companyId)!.push(item)
    })

    const createdOrders: number[] = []

    for (const orderData of orders) {
      const companyItems = cartByCompany.get(orderData.companyId)
      if (!companyItems || companyItems.length === 0) continue

      // Check payment settings
      if (orderData.paymentMethod !== 'cod') {
        const settings = await prisma.companyPaymentSettings.findUnique({
          where: { companyId: orderData.companyId },
        })
        if (!settings) {
          return NextResponse.json({
            error: `Payment settings not configured for company ${orderData.companyId}`
          }, { status: 400 })
        }
      }

      // Upload screenshot if provided
      let screenshotUrl: string | null = null
      if (orderData.screenshotKey) {
        const file = formData.get(orderData.screenshotKey) as File | null
        if (file) {
          const buffer = Buffer.from(await file.arrayBuffer())
          const result = await uploadImage(buffer, 'partner-order-screenshots', file.name)
          screenshotUrl = result.secure_url
        }
      }

      // Calculate total with discounts using companyPrice
      let total = 0
      const itemsData = await Promise.all(
        companyItems.map(async (item) => {
          const basePrice = item.variant.companyPrice || item.variant.customerPrice
          const discount = await getActiveDiscountForItem(
            item.productId,
            item.variantId,
            item.product.companyId
          )
          const finalPrice = discount
            ? calculateDiscountedPrice(basePrice, discount.percentage)
            : basePrice
          total += finalPrice * item.quantity
          return {
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: finalPrice,
            originalPrice: basePrice,
            discountPercentage: discount?.percentage || null,
          }
        })
      )

      // Check minimum order amount
      const settings = await prisma.companyPaymentSettings.findUnique({
        where: { companyId: orderData.companyId },
      })
      if (settings?.minimumOrderAmount && total < settings.minimumOrderAmount) {
        return NextResponse.json({
          error: `Minimum order amount for this company is Rs.${settings.minimumOrderAmount}`
        }, { status: 400 })
      }

      // Create order
      const order = await prisma.partnerOrder.create({
        data: {
          partnerId: partner.id,
          companyId: orderData.companyId,
          city: orderData.city,
          province: orderData.province,
          address: orderData.address,
          shippingAddress: orderData.shippingAddress,
          paymentMethod: orderData.paymentMethod,
          paymentScreenshot: screenshotUrl,
          total,
          status: 'pending',
          items: {
            create: itemsData.map(item => ({
              product: { connect: { id: item.productId } },
              variant: { connect: { id: item.variantId } },
              quantity: item.quantity,
              price: item.price,
              originalPrice: item.originalPrice,
              discountPercentage: item.discountPercentage,
            })),
          },
        },
      })

      createdOrders.push(order.id)
    }

    // Clear cart
    await prisma.partnerCartItem.deleteMany({
      where: { partnerId: partner.id },
    })

    return NextResponse.json({
      success: true,
      orderIds: createdOrders,
    })
  } catch (error) {
    console.error('Partner checkout error:', error)
    return NextResponse.json({ error: 'Failed to process order' }, { status: 500 })
  }
}
