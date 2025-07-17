import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { v2 as cloudinary } from 'cloudinary'
import { z } from 'zod'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  [key: string]: unknown
}

async function uploadImageToCloudinary(buffer: Buffer): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'jobforms',
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          reject(new Error(error?.message || 'Failed to upload image'))
        } else {
          resolve(result)
        }
      }
    )
    uploadStream.end(buffer)
  })
}

// Zod validation schema for job form input
const jobFormSchema = z.object({
  name: z.string().min(1),
  company: z.string().min(1),
  mobileNumber: z.string().min(1),
  email: z.string().email().optional(),
  position: z.string().min(1),
  eligibility: z.string().min(1),
  benefits: z.string().min(1),
  location: z.string().min(1),
  deadline: z.string().min(1),
  noofpositions: z.string().min(1),
  companyAddress: z.string().min(1),
  howToApply: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const imageFile = formData.get('image') as File | null

    const data = {
      name: formData.get('name'),
      company: formData.get('company'),
      mobileNumber: formData.get('mobileNumber'),
      email: formData.get('email'),
      position: formData.get('position'),
      eligibility: formData.get('eligibility'),
      benefits: formData.get('benefits'),
      location: formData.get('location'),
      deadline: formData.get('deadline'),
      noofpositions: formData.get('deadline'),
      companyAddress: formData.get('companyAddress'),
      howToApply: formData.get('howToApply'),
    }

    const validation = jobFormSchema.safeParse(data)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 })
    }

    let imageUploadResult: CloudinaryUploadResult | null = null

    if (imageFile) {
      const arrayBuffer = await imageFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      imageUploadResult = await uploadImageToCloudinary(buffer)
    }

    const result = await prisma.$transaction(async (tx) => {
      let jobFormImage = null

      if (imageUploadResult) {
        jobFormImage = await tx.jobFormImage.create({
          data: {
            url: imageUploadResult.secure_url,
            alt: validation.data.company,
            publicId: imageUploadResult.public_id,
          },
        })
      }

      const jobForm = await tx.jobForm.create({
        data: {
          ...validation.data,
          jobFormImageId: jobFormImage?.id || null,
        },
      })

      return { jobForm, jobFormImage }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    console.error('Error creating job form:', err)
    return NextResponse.json({ error: 'Failed to create job form' }, { status: 500 })
  }
}



export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      prisma.jobForm.findMany({
        where: {
          OR: [
            { name: { contains: search,  } },
            { company: { contains: search,  } },
            { position: { contains: search,  } },
            { location: { contains: search,  } },
          ],
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
        include: {
          jobFormImage: true,
        },
      }),
      prisma.jobForm.count({
        where: {
          OR: [
            { name: { contains: search,  } },
            { company: { contains: search,  } },
            { position: { contains: search,} },
            { location: { contains: search,  } },
          ],
        },
      }),
    ])

    return NextResponse.json({
      data: items,
      total,
      page,
      lastSubmittedAt: items.length > 0 ? items[items.length - 1].createdAt : null,
    })
  } catch (error) {
    console.error('Error fetching job forms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job forms' },
      { status: 500 }
    )
  }
}
