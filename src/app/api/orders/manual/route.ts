import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateVendorOrder, upsertVendorSaleEntry } from '@/lib/vendorLedger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      customerName,
      city,
      province,
      address,
      shippingAddress,
      paymentMethod,
      shipmentCharges,
      status = 'pending',
      items,
    } = body

    const typedName = typeof customerName === 'string' ? customerName.trim() : ''

    if (!userId && !typedName)
      return NextResponse.json({ error: 'Customer is required — pick one or type a name' }, { status: 400 })
    if (!city) return NextResponse.json({ error: 'City is required' }, { status: 400 })
    if (!address) return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    if (!shippingAddress) return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 })
    if (!paymentMethod) return NextResponse.json({ error: 'Payment method is required' }, { status: 400 })
    if (!items || items.length === 0)
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })

    // Resolve the customer:
    //  1. a real selected account (userId) — verify it exists
    //  2. otherwise a typed name — reuse a prior "guest" row with that exact
    //     name (email null, no password) or create a fresh guest User. This
    //     is the failsafe for walk-in / phone orders where the buyer has no
    //     site account: everything downstream (order list, invoice, vendor
    //     ledger) only ever reads user.name / user.email, both of which a
    //     guest row satisfies.
    let resolvedUserId: string
    if (userId) {
      const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
      if (!userExists) return NextResponse.json({ error: `Customer ${userId} not found` }, { status: 400 })
      resolvedUserId = userId
    } else {
      const phone = typeof shippingAddress === 'string' ? shippingAddress.trim() : null
      const existingGuest = await prisma.user.findFirst({
        where: { name: typedName, email: null, password: null },
        select: { id: true },
      })
      if (existingGuest) {
        resolvedUserId = existingGuest.id
        if (phone) {
          await prisma.user.update({ where: { id: existingGuest.id }, data: { PhoneNumber: phone } }).catch(() => {})
        }
      } else {
        const guest = await prisma.user.create({
          data: { name: typedName, PhoneNumber: phone, country: province || null },
          select: { id: true },
        })
        resolvedUserId = guest.id
      }
    }

    const shipCharges = parseFloat(shipmentCharges) || 0
    const itemsTotal = items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    )
    const total = itemsTotal + shipCharges

    const order = await prisma.checkout.create({
      data: {
        user: { connect: { id: resolvedUserId } },
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
