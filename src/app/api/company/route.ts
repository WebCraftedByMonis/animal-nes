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
        folder: 'companies',
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
const companySchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email().optional(),
})

const updateCompanySchema = z.object({
  companyName: z.string().min(1, 'Company name is required').optional(),
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email().optional(),
})


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'id';
  const sortOrder = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';
  const limitParam = searchParams.get('limit') || '10';

  const limit = limitParam === 'all' ? undefined : parseInt(limitParam, 10);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const skip = limit ? (page - 1) * limit : undefined;

  const [items, total] = await Promise.all([
    prisma.company.findMany({
      where: {
        companyName: { contains: search },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
      include: {
        image: true,
        products: true,
      },
    }),
    prisma.company.count({
      where: {
        companyName: { contains: search },
      },
    }),
  ]);

  return NextResponse.json({
    data: items,
    total,
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const companyName = formData.get('companyName') as string
    const mobileNumber = formData.get('mobileNumber') as string | null
    const address = formData.get('address') as string | null
    const email = formData.get('email') as string | null
    const imageFile = formData.get('image') as File | null

    // Validate input
    const validation = companySchema.safeParse({ 
      companyName,
      mobileNumber,
      address,
      email
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Company image is required' },
        { status: 400 }
      )
    }

    // Check for existing companies with any of the provided fields
    const existingCompanies = await prisma.company.findMany({
      where: {
        OR: [
          { companyName: validation.data.companyName },
          ...(validation.data.email ? [{ email: validation.data.email }] : []),
          ...(validation.data.mobileNumber ? [{ mobileNumber: validation.data.mobileNumber }] : []),
          ...(validation.data.address ? [{ address: validation.data.address }] : []),
        ]
      },
      select: {
        companyName: true,
        email: true,
        mobileNumber: true,
        address: true
      }
    })

    if (existingCompanies.length > 0) {
      const duplicateFields = []
      
      for (const existing of existingCompanies) {
        if (existing.companyName === validation.data.companyName) {
          duplicateFields.push('Company Name')
        }
        if (existing.email && existing.email === validation.data.email) {
          duplicateFields.push('Email')
        }
        if (existing.mobileNumber && existing.mobileNumber === validation.data.mobileNumber) {
          duplicateFields.push('Mobile Number')
        }
        if (existing.address && existing.address === validation.data.address) {
          duplicateFields.push('Address')
        }
      }

      const uniqueFields = [...new Set(duplicateFields)]
      const fieldText = uniqueFields.length === 1 
        ? uniqueFields[0] 
        : uniqueFields.slice(0, -1).join(', ') + ' and ' + uniqueFields.slice(-1)

      return NextResponse.json(
        { 
          error: `A company with this ${fieldText} already exists`,
          duplicateFields: uniqueFields
        },
        { status: 409 }
      )
    }

    // Convert file to buffer for Cloudinary upload
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload image to Cloudinary
    const uploadResult = await uploadImageToCloudinary(buffer)

    // Create company and image records in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Create the company first
      const company = await prisma.company.create({
        data: {
          companyName: validation.data.companyName,
          mobileNumber: validation.data.mobileNumber || null,
          address: validation.data.address || null,
          email: validation.data.email || null,
        },
      })

      // Then create the associated image
      const companyImage = await prisma.companyImage.create({
        data: {
          url: uploadResult.secure_url,
          alt: validation.data.companyName,
          publicId: uploadResult.public_id,
          companyId: company.id,
        },
      })

      return { company, companyImage }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    const companyId = parseInt(id)
    if (isNaN(companyId)) {
      return NextResponse.json(
        { error: 'Invalid company ID' },
        { status: 400 }
      )
    }

    // Find the company with its image
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { image: true },
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Delete image from Cloudinary if it exists
    if (company.image) {
      try {
        if (company.image.publicId) {
          await cloudinary.uploader.destroy(company.image.publicId)
        }
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error)
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Delete the company (image will be deleted due to onDelete: Cascade)
    await prisma.company.delete({
      where: { id: companyId },
    })

    return NextResponse.json(
      { message: 'Company deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting company:', error)
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData()
    const id = formData.get('id') as string
    const companyName = formData.get('companyName') as string | null
    const mobileNumber = formData.get('mobileNumber') as string | null
    const address = formData.get('address') as string | null
    const email = formData.get('email') as string | null
    const imageFile = formData.get('image') as File | null

    if (!id) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    const companyId = parseInt(id)
    if (isNaN(companyId)) {
      return NextResponse.json(
        { error: 'Invalid company ID' },
        { status: 400 }
      )
    }

    // Validate input if any field is provided
    if (companyName || mobileNumber || address || email) {
      const validation = updateCompanySchema.safeParse({ 
        companyName,
        mobileNumber,
        address,
        email
      })
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors[0].message },
          { status: 400 }
        )
      }
    }

    // Find the existing company with its image
    const existingCompany = await prisma.company.findUnique({
      where: { id: companyId },
      include: { image: true },
    })

    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    let newImageData = null
    let oldPublicId = null

    // Handle image update if new image is provided
    if (imageFile) {
      // Delete old image from Cloudinary if it exists
      if (existingCompany.image) {
        oldPublicId = existingCompany.image.publicId
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
        alt: companyName || existingCompany.companyName,
        publicId: uploadResult.public_id,
      }
    }

    // Update company and image in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Update the company
      const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: {
          companyName: companyName || existingCompany.companyName,
          mobileNumber: mobileNumber ?? existingCompany.mobileNumber,
          address: address ?? existingCompany.address,
          email: email ?? existingCompany.email,
        },
      })

      // Update or create the image if new image was provided
      if (newImageData) {
        if (existingCompany.image) {
          await prisma.companyImage.update({
            where: { companyId },
            data: newImageData,
          })
        } else {
          await prisma.companyImage.create({
            data: {
              ...newImageData,
              companyId,
            },
          })
        }
      } else if (companyName && existingCompany.image) {
        // Update alt text if only companyName changed
        await prisma.companyImage.update({
          where: { companyId },
          data: {
            alt: companyName,
          },
        })
      }

      return updatedCompany
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    )
  }
}