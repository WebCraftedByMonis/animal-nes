import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

// Zod schemas for validation
const testimonialSchema = z.object({
  content: z.string().min(10, 'testimonial must be at least 10 characters').max(1000, 'testimonial must not exceed 1000 characters'),
})

const updatetestimonialSchema = z.object({
  content: z.string().min(10, 'testimonial must be at least 10 characters').max(1000, 'testimonial must not exceed 1000 characters').optional(),
  isApproved: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

// GET - Fetch testimonials with load more functionality
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '6', 10) // Default 6 per page
    const showAll = searchParams.get('showAll') === 'true' // 
    
    const skip = (page - 1) * limit

    // Build where clause
    const whereClause = showAll 
      ? {} // Show all testimonials
      : {
          isApproved: true,
          isActive: true,
        } // Only show approved and active testimonials

    const [testimonials, total] = await Promise.all([
      prisma.testimonial.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
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
        },
      }),
      prisma.testimonial.count({
        where: whereClause,
      }),
    ])

    const hasMore = skip + testimonials.length < total

    return NextResponse.json({
      data: testimonials,
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    })
  } catch (error) {
    console.error('Error fetching testimonials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch testimonials' },
      { status: 500 }
    )
  }
}

// POST - Create a new testimonial (requires authentication)
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await auth()

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'You must be logged in to post a testimonial' },
        { status: 401 }
      )
    }

    // Resolve DB user — works for both OAuth and credentials users
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const userId = dbUser.id

    const body = await request.json()

    // Validate input
    const validation = testimonialSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    // Check if user already has a testimonial (optional - remove this block if multiple testimonials allowed)
    const existingtestimonial = await prisma.testimonial.findFirst({
      where: {
        userId,
      },
    })

    if (existingtestimonial) {
      return NextResponse.json(
        { error: 'You have already posted a testimonial. Ask customer support to edit your testamonial.' },
        { status: 400 }
      )
    }

    // Create the testimonial
    const testimonial = await prisma.testimonial.create({
      data: {
        content: validation.data.content,
        userId,
        isApproved: false, // Requires approval
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: 'testimonial submitted successfully. It will be visible after approval.',
        data: testimonial,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating testimonial:', error)
    return NextResponse.json(
      { error: 'Failed to create testimonial' },
      { status: 500 }
    )
  }
}

// PUT - Update a testimonial
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'You must be logged in to update a testimonial' },
        { status: 401 }
      )
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const userId = dbUser.id

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'testimonial ID is required' },
        { status: 400 }
      )
    }

    const testimonialId = parseInt(id)
    if (isNaN(testimonialId)) {
      return NextResponse.json(
        { error: 'Invalid testimonial ID' },
        { status: 400 }
      )
    }

    // Validate update data
    const validation = updatetestimonialSchema.safeParse(updateData)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    // Find the testimonial
    const existingtestimonial = await prisma.testimonial.findUnique({
      where: { id: testimonialId },
    })

    if (!existingtestimonial) {
      return NextResponse.json(
        { error: 'testimonial not found' },
        { status: 404 }
      )
    }

    // Check if user owns this testimonial (unless updating approval status)
    const isUpdatingOwntestimonial = existingtestimonial.userId === userId
    const isUpdatingApprovalStatus = validation.data.isApproved !== undefined || validation.data.isActive !== undefined
    
    if (!isUpdatingOwntestimonial && !isUpdatingApprovalStatus) {
      return NextResponse.json(
        { error: 'Ask customer support to edit it.' },
        { status: 403 }
      )
    }

    // Prepare update data
    let dataToUpdate: any = {}
    
    if (validation.data.content !== undefined && isUpdatingOwntestimonial) {
      dataToUpdate.content = validation.data.content
      // Reset approval if user edits their testimonial
      dataToUpdate.isApproved = false
    }
    
    // Allow updating approval status (for admin dashboard later)
    if (validation.data.isApproved !== undefined) {
      dataToUpdate.isApproved = validation.data.isApproved
    }
    if (validation.data.isActive !== undefined) {
      dataToUpdate.isActive = validation.data.isActive
    }

    // Update the testimonial
    const updatedtestimonial = await prisma.testimonial.update({
      where: { id: testimonialId },
      data: dataToUpdate,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    const message = dataToUpdate.content 
      ? 'testimonial updated successfully. It will be visible after approval.'
      : 'testimonial updated successfully'

    return NextResponse.json(
      {
        message,
        data: updatedtestimonial,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating testimonial:', error)
    return NextResponse.json(
      { error: 'Failed to update testimonial' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a testimonial
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be logged in to delete a testimonial' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'testimonial ID is required' },
        { status: 400 }
      )
    }

    const testimonialId = parseInt(id)
    if (isNaN(testimonialId)) {
      return NextResponse.json(
        { error: 'Invalid testimonial ID' },
        { status: 400 }
      )
    }

    // Find the testimonial
    const testimonial = await prisma.testimonial.findUnique({
      where: { id: testimonialId },
    })

    if (!testimonial) {
      return NextResponse.json(
        { error: 'testimonial not found' },
        { status: 404 }
      )
    }

    // For now, allow anyone to delete any testimonial (since no admin roles yet)
    // Later you can restrict this to: user owns it OR user is admin
    // if (testimonial.userId !== session.user.id) {
    //   return NextResponse.json(
    //     { error: 'You can only delete your own testimonial' },
    //     { status: 403 }
    //   )
    // }

    // Delete the testimonial
    await prisma.testimonial.delete({
      where: { id: testimonialId },
    })

    return NextResponse.json(
      { message: 'testimonial deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting testimonial:', error)
    return NextResponse.json(
      { error: 'Failed to delete testimonial' },
      { status: 500 }
    )
  }
}