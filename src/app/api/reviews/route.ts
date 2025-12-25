import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/reviews - Fetch reviews for a product or all reviews (admin)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    const showAll = searchParams.get('showAll') === 'true' // For admin dashboard
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const skip = (page - 1) * limit

    if (showAll) {
      // Admin view - show all reviews
      const session = await auth()
      if (!session?.user?.email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
      }

      const [reviews, total] = await Promise.all([
        prisma.productReview.findMany({
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
            product: {
              select: {
                id: true,
                productName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.productReview.count(),
      ])

      return NextResponse.json({
        data: reviews,
        pagination: {
          page,
          limit,
          total,
          hasMore: skip + reviews.length < total,
        },
      })
    }

    // Public view - show only approved reviews for a specific product
    if (!productId) {
      return NextResponse.json(
        { message: 'productId is required' },
        { status: 400 }
      )
    }

    const reviews = await prisma.productReview.findMany({
      where: {
        productId: parseInt(productId),
        isApproved: true,
      },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { message: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

// POST /api/reviews - Submit a new review
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const { productId, rating, comment } = await req.json()

    // Validate input
    if (!productId || !rating || !comment) {
      return NextResponse.json(
        { message: 'Product ID, rating, and comment are required' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { message: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.productReview.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId: parseInt(productId),
        },
      },
    })

    if (existingReview) {
      return NextResponse.json(
        { message: 'You have already reviewed this product' },
        { status: 400 }
      )
    }

    // Create the review
    const review = await prisma.productReview.create({
      data: {
        userId: user.id,
        productId: parseInt(productId),
        rating: parseInt(rating),
        comment,
      },
    })

    return NextResponse.json(
      { message: 'Review submitted successfully', review },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { message: 'Failed to create review' },
      { status: 500 }
    )
  }
}

// PUT /api/reviews - Update a review (admin only)
export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id, isApproved, comment } = await req.json()

    if (!id) {
      return NextResponse.json(
        { message: 'Review ID is required' },
        { status: 400 }
      )
    }

    const updateData: any = {}

    if (typeof isApproved === 'boolean') {
      updateData.isApproved = isApproved
    }

    if (comment !== undefined) {
      updateData.comment = comment
    }

    const review = await prisma.productReview.update({
      where: { id: parseInt(id) },
      data: updateData,
    })

    return NextResponse.json(
      { message: 'Review updated successfully', review },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating review:', error)
    return NextResponse.json(
      { message: 'Failed to update review' },
      { status: 500 }
    )
  }
}

// DELETE /api/reviews - Delete a review (admin only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { message: 'Review ID is required' },
        { status: 400 }
      )
    }

    await prisma.productReview.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json(
      { message: 'Review deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting review:', error)
    return NextResponse.json(
      { message: 'Failed to delete review' },
      { status: 500 }
    )
  }
}
