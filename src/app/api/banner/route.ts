import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadImage, deleteFromCloudinary } from '@/lib/cloudinary'
import { z } from 'zod'

// Configure route to handle larger payloads (up to 50MB)
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds for file processing


// Zod schemas for validation
const bannerSchema = z.object({
  position: z.string().transform((val) => parseInt(val, 10)).refine((val) => !isNaN(val) && val > 0, {
    message: 'Position must be a positive integer',
  }),
  alt: z.string().min(1, 'Alt text is required'),
})

const updateBannerSchema = z.object({
  position: z.string().transform((val) => parseInt(val, 10)).refine((val) => !isNaN(val) && val > 0, {
    message: 'Position must be a positive integer',
  }).optional(),
  alt: z.string().min(1, 'Alt text is required').optional(),
})

// GET - Fetch all banners
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc'
    const limitParam = searchParams.get('limit') || '10'
    
    const limit = limitParam === 'all' ? undefined : parseInt(limitParam, 10)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const skip = limit ? (page - 1) * limit : undefined

    const [banners, total] = await Promise.all([
      prisma.banner.findMany({
        orderBy: {
          position: sortOrder,
        },
        skip,
        take: limit,
        include: {
          image: true,
        },
      }),
      prisma.banner.count(),
    ])

    return NextResponse.json({
      data: banners,
      total,
    })
  } catch (error) {
    console.error('Error fetching banners:', error)
    return NextResponse.json(
      { error: 'Failed to fetch banners' },
      { status: 500 }
    )
  }
}

// POST - Create a new banner
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const position = formData.get('position') as string
    const alt = formData.get('alt') as string
    const imageFile = formData.get('image') as File | null

    // Validate input
    const validation = bannerSchema.safeParse({ 
      position,
      alt,
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Banner image is required' },
        { status: 400 }
      )
    }

    // Check if position is already taken
    const existingBanner = await prisma.banner.findUnique({
      where: { position: validation.data.position },
    })

    if (existingBanner) {
      return NextResponse.json(
        { error: 'A banner already exists at this position' },
        { status: 400 }
      )
    }

    // Check if alt text is already taken
    const existingAlt = await prisma.bannerImage.findUnique({
      where: { alt: validation.data.alt },
    })

    if (existingAlt) {
      return NextResponse.json(
        { error: 'Alt text must be unique' },
        { status: 400 }
      )
    }

    // Convert file to buffer for Cloudinary upload
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload image to Cloudinary
    const uploadResult = await uploadImage(buffer, 'banners', imageFile.name)

    // Create banner and image records in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Create the banner first
      const banner = await prisma.banner.create({
        data: {
          position: validation.data.position,
        },
      })

      // Then create the associated image
      const bannerImage = await prisma.bannerImage.create({
        data: {
          url: uploadResult.secure_url,
          alt: validation.data.alt,
          publicId: uploadResult.public_id,
          bannerId: banner.id,
        },
      })

      // Return banner with image
      return await prisma.banner.findUnique({
        where: { id: banner.id },
        include: { image: true },
      })
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating banner:', error)
    return NextResponse.json(
      { error: 'Failed to create banner' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a banner
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Banner ID is required' },
        { status: 400 }
      )
    }

    const bannerId = parseInt(id)
    if (isNaN(bannerId)) {
      return NextResponse.json(
        { error: 'Invalid banner ID' },
        { status: 400 }
      )
    }

    // Find the banner with its image
    const banner = await prisma.banner.findUnique({
      where: { id: bannerId },
      include: { image: true },
    })

    if (!banner) {
      return NextResponse.json(
        { error: 'Banner not found' },
        { status: 404 }
      )
    }

    // Delete image from Cloudinary if it exists
    if (banner.image) {
      try {
        if (banner.image.publicId) {
          await deleteFromCloudinary(banner.image.publicId, 'image')
        }
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error)
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Delete the banner (image will be deleted due to onDelete: Cascade)
    await prisma.banner.delete({
      where: { id: bannerId },
    })

    return NextResponse.json(
      { message: 'Banner deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting banner:', error)
    return NextResponse.json(
      { error: 'Failed to delete banner' },
      { status: 500 }
    )
  }
}

// PUT - Update a banner
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData()
    const id = formData.get('id') as string
    const position = formData.get('position') as string | null
    const alt = formData.get('alt') as string | null
    const imageFile = formData.get('image') as File | null

    if (!id) {
      return NextResponse.json(
        { error: 'Banner ID is required' },
        { status: 400 }
      )
    }

    const bannerId = parseInt(id)
    if (isNaN(bannerId)) {
      return NextResponse.json(
        { error: 'Invalid banner ID' },
        { status: 400 }
      )
    }

    // Validate input if any field is provided
    let validatedData: any = {}
    if (position || alt) {
      const validation = updateBannerSchema.safeParse({ 
        position,
        alt,
      })
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors[0].message },
          { status: 400 }
        )
      }
      validatedData = validation.data
    }

    // Find the existing banner with its image
    const existingBanner = await prisma.banner.findUnique({
      where: { id: bannerId },
      include: { image: true },
    })

    if (!existingBanner) {
      return NextResponse.json(
        { error: 'Banner not found' },
        { status: 404 }
      )
    }

    // Check if new position is already taken by another banner
    if (validatedData.position && validatedData.position !== existingBanner.position) {
      const positionTaken = await prisma.banner.findUnique({
        where: { position: validatedData.position },
      })
      if (positionTaken) {
        return NextResponse.json(
          { error: 'A banner already exists at this position' },
          { status: 400 }
        )
      }
    }

    // Check if new alt text is already taken by another image
    if (validatedData.alt && existingBanner.image && validatedData.alt !== existingBanner.image.alt) {
      const altTaken = await prisma.bannerImage.findUnique({
        where: { alt: validatedData.alt },
      })
      if (altTaken) {
        return NextResponse.json(
          { error: 'Alt text must be unique' },
          { status: 400 }
        )
      }
    }

    let newImageData = null
    let oldPublicId = null

    // Handle image update if new image is provided
    if (imageFile) {
      // Delete old image from Cloudinary if it exists
      if (existingBanner.image) {
        oldPublicId = existingBanner.image.publicId
        try {
          if (oldPublicId) {
            await deleteFromCloudinary(oldPublicId, 'image')
          }
        } catch (error) {
          console.error('Error deleting old image from Cloudinary:', error)
          // Continue with new image upload even if old image deletion fails
        }
      }

      // Upload new image to Cloudinary
      const arrayBuffer = await imageFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const uploadResult = await uploadImage(buffer, 'banners', imageFile.name)

      newImageData = {
        url: uploadResult.secure_url,
        alt: validatedData.alt || (existingBanner.image?.alt || `Banner ${bannerId}`),
        publicId: uploadResult.public_id,
      }
    }

    // Update banner and image in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Update the banner position if provided
      if (validatedData.position) {
        await prisma.banner.update({
          where: { id: bannerId },
          data: {
            position: validatedData.position,
          },
        })
      }

      // Update or create the image
      if (newImageData) {
        if (existingBanner.image) {
          await prisma.bannerImage.update({
            where: { bannerId },
            data: newImageData,
          })
        } else {
          await prisma.bannerImage.create({
            data: {
              ...newImageData,
              bannerId,
            },
          })
        }
      } else if (validatedData.alt && existingBanner.image) {
        // Update only alt text if no new image but alt text changed
        await prisma.bannerImage.update({
          where: { bannerId },
          data: {
            alt: validatedData.alt,
          },
        })
      }

      // Return updated banner with image
      return await prisma.banner.findUnique({
        where: { id: bannerId },
        include: { image: true },
      })
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error updating banner:', error)
    return NextResponse.json(
      { error: 'Failed to update banner' },
      { status: 500 }
    )
  }
}