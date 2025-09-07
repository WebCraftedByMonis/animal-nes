import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { v2 as cloudinary } from 'cloudinary'
import { z } from 'zod'

// Configure route to handle larger payloads (up to 50MB)
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds for file processing

interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  [key: string]: unknown
}

interface CloudinaryError {
  message: string
  [key: string]: unknown
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

async function uploadImageToCloudinary(buffer: Buffer): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder: 'traditional-job-posts',
        resource_type: 'image',
      },
      (error: CloudinaryError | undefined, result: CloudinaryUploadResult | undefined) => {
        if (error) {
          reject(new Error(error.message))
        } else if (!result) {
          reject(new Error('No result from Cloudinary'))
        } else {
          resolve(result)
        }
      }
    )
    uploadStream.end(buffer)
  })
}

// Zod schemas for validation
const traditionalJobPostSchema = z.object({
  title: z.string().min(1, 'Job title is required'),
  description: z.string().min(1, 'Job description is required'),
})

const updateTraditionalJobPostSchema = z.object({
  title: z.string().min(1, 'Job title is required').optional(),
  description: z.string().min(1, 'Job description is required').optional(),
})

// GET - Fetch all traditional job posts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'id'
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc'
    const limitParam = searchParams.get('limit') || '10'

    const limit = limitParam === 'all' ? undefined : parseInt(limitParam, 10)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const skip = limit ? (page - 1) * limit : undefined

    const [items, total] = await Promise.all([
      prisma.traditionalJobPost.findMany({
        where: {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
          ],
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
        include: {
          image: true,
        },
      }),
      prisma.traditionalJobPost.count({
        where: {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
          ],
        },
      }),
    ])

    return NextResponse.json({
      data: items,
      total,
    })
  } catch (error) {
    console.error('Error fetching traditional job posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job posts' },
      { status: 500 }
    )
  }
}

// POST - Create a new traditional job post
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const imageFile = formData.get('image') as File | null

    // Validate input
    const validation = traditionalJobPostSchema.safeParse({ 
      title,
      description,
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Job post image is required' },
        { status: 400 }
      )
    }

    // Convert file to buffer for Cloudinary upload
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload image to Cloudinary
    const uploadResult = await uploadImageToCloudinary(buffer)

    // Create job post and image records in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Create the job post first
      const jobPost = await prisma.traditionalJobPost.create({
        data: {
          title: validation.data.title,
          description: validation.data.description,
        },
      })

      // Then create the associated image
      const jobPostImage = await prisma.traditionalJobPostImage.create({
        data: {
          url: uploadResult.secure_url,
          alt: validation.data.title,
          publicId: uploadResult.public_id,
          jobPostId: jobPost.id,
        },
      })

      // Return job post with image
      return await prisma.traditionalJobPost.findUnique({
        where: { id: jobPost.id },
        include: { image: true },
      })
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating traditional job post:', error)
    return NextResponse.json(
      { error: 'Failed to create job post' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a traditional job post
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Job post ID is required' },
        { status: 400 }
      )
    }

    const jobPostId = parseInt(id)
    if (isNaN(jobPostId)) {
      return NextResponse.json(
        { error: 'Invalid job post ID' },
        { status: 400 }
      )
    }

    // Find the job post with its image
    const jobPost = await prisma.traditionalJobPost.findUnique({
      where: { id: jobPostId },
      include: { image: true },
    })

    if (!jobPost) {
      return NextResponse.json(
        { error: 'Job post not found' },
        { status: 404 }
      )
    }

    // Delete image from Cloudinary if it exists
    if (jobPost.image) {
      try {
        if (jobPost.image.publicId) {
          await cloudinary.uploader.destroy(jobPost.image.publicId)
        }
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error)
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Delete the job post (image will be deleted due to onDelete: Cascade)
    await prisma.traditionalJobPost.delete({
      where: { id: jobPostId },
    })

    return NextResponse.json(
      { message: 'Job post deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting traditional job post:', error)
    return NextResponse.json(
      { error: 'Failed to delete job post' },
      { status: 500 }
    )
  }
}

// PUT - Update a traditional job post
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData()
    const id = formData.get('id') as string
    const title = formData.get('title') as string | null
    const description = formData.get('description') as string | null
    const imageFile = formData.get('image') as File | null

    if (!id) {
      return NextResponse.json(
        { error: 'Job post ID is required' },
        { status: 400 }
      )
    }

    const jobPostId = parseInt(id)
    if (isNaN(jobPostId)) {
      return NextResponse.json(
        { error: 'Invalid job post ID' },
        { status: 400 }
      )
    }

    // Validate input if any field is provided
    if (title || description) {
      const validation = updateTraditionalJobPostSchema.safeParse({ 
        title,
        description,
      })
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors[0].message },
          { status: 400 }
        )
      }
    }

    // Find the existing job post with its image
    const existingJobPost = await prisma.traditionalJobPost.findUnique({
      where: { id: jobPostId },
      include: { image: true },
    })

    if (!existingJobPost) {
      return NextResponse.json(
        { error: 'Job post not found' },
        { status: 404 }
      )
    }

    let newImageData = null
    let oldPublicId = null

    // Handle image update if new image is provided
    if (imageFile) {
      // Delete old image from Cloudinary if it exists
      if (existingJobPost.image) {
        oldPublicId = existingJobPost.image.publicId
        try {
          if (oldPublicId) {
            await cloudinary.uploader.destroy(oldPublicId)
          }
        } catch (error) {
          console.error('Error deleting old image from Cloudinary:', error)
          // Continue with new image upload even if old image deletion fails
        }
      }

      // Upload new image to Cloudinary
      const arrayBuffer = await imageFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const uploadResult = await uploadImageToCloudinary(buffer)

      newImageData = {
        url: uploadResult.secure_url,
        alt: title || existingJobPost.title,
        publicId: uploadResult.public_id,
      }
    }

    // Update job post and image in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Update the job post
      const updatedJobPost = await prisma.traditionalJobPost.update({
        where: { id: jobPostId },
        data: {
          title: title || existingJobPost.title,
          description: description || existingJobPost.description,
        },
      })

      // Update or create the image if new image was provided
      if (newImageData) {
        if (existingJobPost.image) {
          await prisma.traditionalJobPostImage.update({
            where: { jobPostId },
            data: newImageData,
          })
        } else {
          await prisma.traditionalJobPostImage.create({
            data: {
              ...newImageData,
              jobPostId,
            },
          })
        }
      } else if (title && existingJobPost.image) {
        // Update alt text if only title changed
        await prisma.traditionalJobPostImage.update({
          where: { jobPostId },
          data: {
            alt: title,
          },
        })
      }

      // Return updated job post with image
      return await prisma.traditionalJobPost.findUnique({
        where: { id: jobPostId },
        include: { image: true },
      })
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error updating traditional job post:', error)
    return NextResponse.json(
      { error: 'Failed to update job post' },
      { status: 500 }
    )
  }
}