import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for updating discounts
const updateDiscountSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional().nullable(),
  percentage: z.number().min(0.01).max(100).optional(),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  isActive: z.boolean().optional(),
  productId: z.number().optional().nullable(),
  variantId: z.number().optional().nullable(),
})

// GET - Get a single discount
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const discountId = parseInt(id)

    if (isNaN(discountId)) {
      return NextResponse.json(
        { error: 'Invalid discount ID' },
        { status: 400 }
      )
    }

    const discount = await prisma.discount.findUnique({
      where: { id: discountId },
      include: {
        product: {
          select: {
            id: true,
            productName: true,
            image: { select: { url: true } },
            variants: {
              select: {
                id: true,
                packingVolume: true,
                customerPrice: true
              }
            }
          }
        },
        variant: {
          select: {
            id: true,
            packingVolume: true,
            customerPrice: true,
            product: {
              select: {
                id: true,
                productName: true,
                image: { select: { url: true } }
              }
            }
          }
        }
      }
    })

    if (!discount) {
      return NextResponse.json(
        { error: 'Discount not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(discount)
  } catch (error) {
    console.error('Error fetching discount:', error)
    return NextResponse.json(
      { error: 'Failed to fetch discount' },
      { status: 500 }
    )
  }
}

// PUT - Update a discount
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const discountId = parseInt(id)

    if (isNaN(discountId)) {
      return NextResponse.json(
        { error: 'Invalid discount ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validation = updateDiscountSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    // Check if discount exists
    const existingDiscount = await prisma.discount.findUnique({
      where: { id: discountId }
    })

    if (!existingDiscount) {
      return NextResponse.json(
        { error: 'Discount not found' },
        { status: 404 }
      )
    }

    const { productId, variantId, startDate, endDate, ...updateData } = validation.data

    // Validate date range if dates are being updated
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : existingDiscount.startDate
      const end = endDate ? new Date(endDate) : existingDiscount.endDate
      if (end <= start) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        )
      }
    }

    // Build update data
    const data: any = { ...updateData }

    if (startDate) data.startDate = new Date(startDate)
    if (endDate) data.endDate = new Date(endDate)

    // Handle product/variant assignment
    if (productId !== undefined || variantId !== undefined) {
      if (variantId) {
        const variant = await prisma.productVariant.findUnique({ where: { id: variantId } })
        if (!variant) {
          return NextResponse.json(
            { error: 'Variant not found' },
            { status: 404 }
          )
        }
        data.variantId = variantId
        data.productId = null // Clear product if variant is set
      } else if (productId) {
        const product = await prisma.product.findUnique({ where: { id: productId } })
        if (!product) {
          return NextResponse.json(
            { error: 'Product not found' },
            { status: 404 }
          )
        }
        data.productId = productId
        data.variantId = null // Clear variant if product is set
      }
    }

    const discount = await prisma.discount.update({
      where: { id: discountId },
      data,
      include: {
        product: {
          select: {
            id: true,
            productName: true,
            image: { select: { url: true } }
          }
        },
        variant: {
          select: {
            id: true,
            packingVolume: true,
            customerPrice: true,
            product: {
              select: {
                id: true,
                productName: true,
                image: { select: { url: true } }
              }
            }
          }
        }
      }
    })

    return NextResponse.json(discount)
  } catch (error) {
    console.error('Error updating discount:', error)
    return NextResponse.json(
      { error: 'Failed to update discount' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a discount
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const discountId = parseInt(id)

    if (isNaN(discountId)) {
      return NextResponse.json(
        { error: 'Invalid discount ID' },
        { status: 400 }
      )
    }

    // Check if discount exists
    const discount = await prisma.discount.findUnique({
      where: { id: discountId }
    })

    if (!discount) {
      return NextResponse.json(
        { error: 'Discount not found' },
        { status: 404 }
      )
    }

    await prisma.discount.delete({
      where: { id: discountId }
    })

    return NextResponse.json({ message: 'Discount deleted successfully' })
  } catch (error) {
    console.error('Error deleting discount:', error)
    return NextResponse.json(
      { error: 'Failed to delete discount' },
      { status: 500 }
    )
  }
}

// PATCH - Toggle discount active status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const discountId = parseInt(id)

    if (isNaN(discountId)) {
      return NextResponse.json(
        { error: 'Invalid discount ID' },
        { status: 400 }
      )
    }

    const discount = await prisma.discount.findUnique({
      where: { id: discountId }
    })

    if (!discount) {
      return NextResponse.json(
        { error: 'Discount not found' },
        { status: 404 }
      )
    }

    const updatedDiscount = await prisma.discount.update({
      where: { id: discountId },
      data: { isActive: !discount.isActive },
      include: {
        product: {
          select: {
            id: true,
            productName: true
          }
        },
        variant: {
          select: {
            id: true,
            packingVolume: true,
            product: {
              select: {
                id: true,
                productName: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(updatedDiscount)
  } catch (error) {
    console.error('Error toggling discount:', error)
    return NextResponse.json(
      { error: 'Failed to toggle discount' },
      { status: 500 }
    )
  }
}
