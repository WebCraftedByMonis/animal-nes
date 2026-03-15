import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createProductSaleTransaction, createAnimalSaleTransaction } from '@/lib/autoTransaction'
import { getActiveDiscountForItem, calculateDiscountedPrice } from '@/lib/discount-utils'
import nodemailer from 'nodemailer'

async function sendOrderConfirmationEmail(to: string, name: string, orderId: string, total: number, paymentMethod: string, items: any[]) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD },
    })

    const itemRows = items.map(item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${item.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">PKR ${item.price.toLocaleString()}</td>
      </tr>`).join('')

    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 40px;text-align:center;">
      <div style="width:64px;height:64px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
        <span style="font-size:28px;">✓</span>
      </div>
      <h1 style="margin:0;color:#fff;font-size:24px;">Order Confirmed!</h1>
      <p style="margin:8px 0 0;color:#bbf7d0;font-size:14px;">Thank you for shopping with AnimalWellness</p>
    </div>
    <div style="padding:32px 40px;">
      <p style="color:#374151;font-size:15px;">Hi <strong>${name || 'there'}</strong>,</p>
      <p style="color:#6b7280;font-size:14px;line-height:1.6;">We've received your order and it's being processed. You'll hear from us once it's dispatched.</p>

      <div style="background:#f9fafb;border-radius:8px;padding:16px 20px;margin:20px 0;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;">Order ID</span>
          <span style="font-size:13px;color:#374151;font-weight:600;">#${orderId.slice(-8).toUpperCase()}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;">Payment</span>
          <span style="font-size:13px;color:#374151;">${paymentMethod}</span>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;">Item</th>
            <th style="padding:8px 12px;text-align:center;font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;">Qty</th>
            <th style="padding:8px 12px;text-align:right;font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:12px;text-align:right;font-weight:700;font-size:15px;color:#374151;">Total:</td>
            <td style="padding:12px;text-align:right;font-weight:700;font-size:15px;color:#16a34a;">PKR ${total.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <div style="border-top:1px solid #f0f0f0;padding-top:20px;text-align:center;">
        <p style="margin:0 0 12px;font-size:13px;color:#6b7280;">Stay connected with us on WhatsApp</p>
        <a href="https://chat.whatsapp.com/CqLyuyp92ex6cZ7EtpfwaU" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;margin-right:8px;">Join Community</a>
        <a href="https://whatsapp.com/channel/0029VaeV6OQ9mrGjhvOQkW2t" style="display:inline-block;background:#fff;border:2px solid #25D366;color:#25D366;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;">Follow Channel</a>
      </div>
    </div>
    <div style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} AnimalWellness · 67-K Block DHA Phase-1, Lahore</p>
    </div>
  </div>
</body></html>`

    // Send to customer
    await transporter.sendMail({
      from: `"AnimalWellness" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Order Confirmed #${orderId.slice(-8).toUpperCase()} — AnimalWellness`,
      html,
    })

    // Notify admin
    const adminHtml = `
<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#1e293b;padding:24px 32px;">
      <h2 style="margin:0;color:#fff;font-size:20px;">🛒 New Order Received</h2>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">${new Date().toLocaleString()}</p>
    </div>
    <div style="padding:28px 32px;color:#374151;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:6px 0;font-size:13px;color:#6b7280;width:120px;">Order ID</td><td style="padding:6px 0;font-size:13px;font-weight:600;">#${orderId.slice(-8).toUpperCase()}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#6b7280;">Customer</td><td style="padding:6px 0;font-size:13px;">${name || 'N/A'} (${to})</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#6b7280;">Payment</td><td style="padding:6px 0;font-size:13px;">${paymentMethod}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#6b7280;">Total</td><td style="padding:6px 0;font-size:15px;font-weight:700;color:#16a34a;">PKR ${total.toLocaleString()}</td></tr>
      </table>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#f8fafc;"><th style="padding:8px 10px;text-align:left;font-size:12px;color:#94a3b8;">Item</th><th style="padding:8px 10px;text-align:center;font-size:12px;color:#94a3b8;">Qty</th><th style="padding:8px 10px;text-align:right;font-size:12px;color:#94a3b8;">Price</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div style="margin-top:20px;text-align:center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;">View in Dashboard</a>
      </div>
    </div>
  </div>
</body></html>`

    await transporter.sendMail({
      from: `"AnimalWellness Orders" <${process.env.EMAIL_USER}>`,
      to: 'animalwellnessshop@gmail.com',
      subject: `🛒 New Order #${orderId.slice(-8).toUpperCase()} — PKR ${total.toLocaleString()} (${paymentMethod})`,
      html: adminHtml,
    })
  } catch (e) {
    console.error('Order confirmation email failed:', e)
  }
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
              paymentMethod,
              'PENDING'
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
            paymentMethod,
            'PENDING'
          )
        }
      }
    }

    // Send order confirmation email (non-blocking)
    const user = await prisma.user.findUnique({ where: { email: session.user.email! }, select: { name: true, email: true } })
    if (user?.email) {
      const emailItems = [
        ...cartItemsWithDiscounts.map((item: any) => ({
          name: `${item.product?.productName || 'Product'} — ${item.variant?.packingVolume || ''}`.trim(),
          quantity: item.quantity,
          price: item.finalPrice * item.quantity,
        })),
        ...animalCart.map((item: any) => ({
          name: `${item.animal?.specie || 'Animal'} — ${item.animal?.breed || ''}`.trim(),
          quantity: item.quantity,
          price: item.animal?.totalPrice * item.quantity,
        })),
      ]
      sendOrderConfirmationEmail(user.email, user.name || '', order.id, calculatedTotal, paymentMethod, emailItems)
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
