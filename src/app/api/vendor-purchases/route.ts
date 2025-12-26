import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateTransactionProfit } from '@/lib/autoTransaction'

// GET - Fetch vendor purchases with search and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Build where clause for search
    const whereClause: any = {}

    if (search) {
      whereClause.OR = [
        { product: { productName: { contains: search } } },
        { product: { company: { companyName: { contains: search } } } },
        { product: { partner: { partnerName: { contains: search } } } },
        { animal: { specie: { contains: search } } },
        { animal: { breed: { contains: search } } }
      ]
    }

    // Fetch checkout items with related data
    const items = await prisma.checkoutItem.findMany({
      where: whereClause,
      include: {
        checkout: {
          select: {
            id: true,
            createdAt: true,
            status: true
          }
        },
        product: {
          include: {
            company: {
              select: {
                id: true,
                companyName: true
              }
            },
            partner: {
              select: {
                id: true,
                partnerName: true,
                shopName: true
              }
            }
          }
        },
        variant: {
          select: {
            id: true,
            packingVolume: true
          }
        },
        animal: {
          select: {
            id: true,
            specie: true,
            breed: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: {
        checkout: {
          createdAt: 'desc'
        }
      }
    })

    // Count total items for pagination
    const total = await prisma.checkoutItem.count({
      where: whereClause
    })

    // Transform data to match frontend interface
    const purchases = items.map(item => ({
      orderId: item.checkout.id,
      itemId: item.id,
      orderDate: item.checkout.createdAt,
      partnerName: item.product?.partner?.partnerName || null,
      companyName: item.product?.company?.companyName || null,
      productName: item.product?.productName || null,
      animalDetails: item.animal ? `${item.animal.specie} - ${item.animal.breed}` : null,
      variant: item.variant?.packingVolume || null,
      quantity: item.quantity,
      sellingPrice: item.price,
      purchasedPrice: item.purchasedPrice,
      status: item.checkout.status
    }))

    return NextResponse.json({
      purchases,
      total,
      page,
      limit
    })
  } catch (error) {
    console.error('Error fetching vendor purchases:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor purchases' },
      { status: 500 }
    )
  }
}

// PATCH - Update purchased price for a checkout item and recalculate profit
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { itemId, purchasedPrice } = body

    if (!itemId || purchasedPrice === undefined) {
      return NextResponse.json(
        { error: 'Item ID and purchased price are required' },
        { status: 400 }
      )
    }

    // Get current item to get selling price and quantity
    const currentItem = await prisma.checkoutItem.findUnique({
      where: { id: itemId }
    })

    if (!currentItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Update the checkout item with the new purchased price
    const updatedItem = await prisma.checkoutItem.update({
      where: {
        id: itemId
      },
      data: {
        purchasedPrice: parseFloat(purchasedPrice)
      }
    })

    // Recalculate and update profit in finance transactions
    const totalSellingPrice = currentItem.price * currentItem.quantity
    const totalPurchasedPrice = parseFloat(purchasedPrice) * currentItem.quantity

    await updateTransactionProfit(itemId, totalSellingPrice, totalPurchasedPrice)

    console.log(`[Vendor Purchase] Updated item #${itemId}: Selling: ${totalSellingPrice}, Cost: ${totalPurchasedPrice}, Profit: ${totalSellingPrice - totalPurchasedPrice}`)

    return NextResponse.json({
      success: true,
      item: updatedItem,
      profit: totalSellingPrice - totalPurchasedPrice
    })
  } catch (error) {
    console.error('Error updating purchased price:', error)
    return NextResponse.json(
      { error: 'Failed to update purchased price' },
      { status: 500 }
    )
  }
}
