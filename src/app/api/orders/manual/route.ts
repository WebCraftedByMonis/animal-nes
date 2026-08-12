import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateVendorOrder, upsertVendorSaleEntry } from '@/lib/vendorLedger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      city,
      province,
      address,
      shippingAddress,
      paymentMethod,
      shipmentCharges,
      status = 'pending',
      items,
    } = body

    if (!userId) return NextResponse.json({ error: 'Customer is required' }, { status: 400 })
    if (!city) return NextResponse.json({ error: 'City is required' }, { status: 400 })
    if (!address) return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    if (!shippingAddress) return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 })
    if (!paymentMethod) return NextResponse.json({ error: 'Payment method is required' }, { status: 400 })
    if (!items || items.length === 0)
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })

    const shipCharges = parseFloat(shipmentCharges) || 0
    const itemsTotal = items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    )
    const total = itemsTotal + shipCharges

    const order = await prisma.checkout.create({
      data: {
        user: { connect: { id: userId } },
        city,
        province: province || '',
        address,
        shippingAddress,
        paymentMethod,
        shipmentcharges: shipCharges.toString(),
        total,
        status,
        items: {
          create: items.map((item: any) => {
            const data: any = {
              quantity: item.quantity,
              price: item.price,
              purchasedPrice: item.purchasedPrice || null,
            }
            if (item.productId) {
              data.product = { connect: { id: item.productId } }
            }
            if (item.variantId) {
              data.variant = { connect: { id: item.variantId } }
            }
            return data
          }),
        },
      },
    })

    // Split product items into their vendor's (company's) sub-order and
    // record what's owed to that vendor, same as the customer checkout flow
    const createdItems = await prisma.checkoutItem.findMany({
      where: { checkoutId: order.id, productId: { not: null } },
      include: { product: { select: { companyId: true } } },
    })

    for (const item of createdItems) {
      const companyId = item.product?.companyId
      if (!companyId) continue

      const vendorOrder = await getOrCreateVendorOrder(order.id, companyId)
      await prisma.checkoutItem.update({
        where: { id: item.id },
        data: { vendorOrderId: vendorOrder.id },
      })
      await upsertVendorSaleEntry({
        companyId,
        checkoutItemId: item.id,
        vendorOrderId: vendorOrder.id,
        purchasedPrice: item.purchasedPrice,
        quantity: item.quantity,
      })
    }

    return NextResponse.json({ success: true, orderId: order.id })
  } catch (error) {
    console.error('Manual order creation error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
