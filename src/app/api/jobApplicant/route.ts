import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadImage, uploadRawFile, deleteFromCloudinary } from '@/lib/cloudinary'
import { z } from 'zod'
import { auth } from '@/lib/auth'

// Configure route to handle larger payloads (up to 50MB)
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds for file processing


const jobApplicantSchema = z.object({
    name: z.string().min(1),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
    mobileNumber: z.string().min(1),
    address: z.string().min(1),
    qualification: z.string().optional(),
   
  dateOfBirth: z.string().transform((val) => new Date(val)),
  

    expectedPosition: z.string().optional(),
    expectedSalary: z.string().optional(),
    preferredIndustry: z.string().optional(),
    preferredLocation: z.string().optional(),
    highestDegree: z.string().optional(),
    degreeInstitution: z.string().optional(),
    majorFieldOfStudy: z.string().optional(),
    workExperience: z.string().optional(),
    previousCompany: z.string().optional(),
    declaration: z.enum(['AGREED', 'NOT_AGREED']),
    imageId: z.number().optional(),
    cvId: z.number().optional(),
})

const updateApplicantSchema = jobApplicantSchema.partial()

async function uploadToCloudinary(file: File, folder: string) {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    if (file.type.startsWith('image/')) {
        return uploadImage(buffer, folder, file.name)
    } else {
        return uploadRawFile(buffer, folder, file.name)
    }
}


export async function POST(request: NextRequest) {
    console.log('POST /applicant - received request')
    try {
        const session = await auth()
        console.log('Session fetched:', session ? { userEmail: session.user?.email, userId: session.user?.id } : null)

        if (!session?.user?.email) {
            console.log('Unauthorized: no session or user email')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()
        console.log('Form data keys:', Array.from(formData.keys()))

        const fields = Object.fromEntries(formData.entries())
        // Note: formData.entries() will include files as well — stringify safely
        console.log('Fields (raw):', Object.keys(fields))

        const parsed = jobApplicantSchema.safeParse(fields)
        console.log('Validation result:', parsed.success ? 'success' : 'failure')
        if (!parsed.success) {
            console.log('Validation errors:', parsed.error.errors)
            return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
        }

        const image = formData.get('image')
        const cv = formData.get('cv')
        console.log('Received image:', image instanceof File ? { name: image.name, size: image.size, type: image.type } : image)
        console.log('Received cv:', cv instanceof File ? { name: cv.name, size: cv.size, type: cv.type } : cv)

        let imageData = null
        let cvData = null

        if (image instanceof File) {
            console.log('Uploading image to Cloudinary:', image.name)
            const result = await uploadToCloudinary(image, 'applicants/images')
            console.log('Cloudinary image result:', result)
            imageData = await prisma.applicantImage.create({
                data: {
                    url: result.secure_url,
                    publicId: result.public_id,
                    alt: parsed.data.name,
                },
            })
            console.log('Created applicantImage record id:', imageData.id)
        }

        if (cv instanceof File) {
            console.log('Uploading CV to Cloudinary:', cv.name)
            const result = await uploadToCloudinary(cv, 'applicants/cvs')
            console.log('Cloudinary cv result:', result)
            cvData = await prisma.applicantCV.create({
                data: {
                    url: result.secure_url,
                    publicId: result.public_id,
                    alt: parsed.data.name,
                },
            })
            console.log('Created applicantCV record id:', cvData.id)
        }

        console.log('Looking up user by email:', session.user.email)
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        })

        if (!user) {
            console.log('User not found for email:', session.user.email)
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }
        console.log('User found:', { id: user.id, email: user.email })

        const applicantPayload = {
            ...parsed.data,
            imageId: imageData?.id ?? null,
            cvId: cvData?.id ?? null,
            userId: user.id,
        }
        console.log('Creating jobApplicant with payload keys:', Object.keys(applicantPayload))

        const applicant = await prisma.jobApplicant.create({
            data: applicantPayload,
        })

        console.log('Applicant created:', { id: applicant.id })
        return NextResponse.json(applicant, { status: 201 })
    } catch (err) {
        console.error('Create error:', err)
        // If err has .message and .stack, log them for better debugging
        if (err instanceof Error) {
            console.error('Error message:', err.message)
            console.error('Error stack:', err.stack)
        }
        return NextResponse.json({ error: 'Failed to create applicant' }, { status: 500 })
    }
}
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

        const applicant = await prisma.jobApplicant.findUnique({
            where: { id: parseInt(id) },
            include: { image: true, cv: true },
        })

        if (!applicant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        if (applicant.image?.publicId) {
            await deleteFromCloudinary(applicant.image.publicId, 'image')
        }
        if (applicant.cv?.publicId) {
            await deleteFromCloudinary(applicant.cv.publicId, 'raw')
        }

        await prisma.jobApplicant.delete({ where: { id: applicant.id } })

        return NextResponse.json({ message: 'Deleted' }, { status: 200 })
    } catch (err) {
        console.error('Delete error:', err)
        return NextResponse.json({ error: 'Failed to delete applicant' }, { status: 500 })
    }
}
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const declaration = searchParams.get('declaration'); // e.g. 'AGREED' or undefined
  const skip = (page - 1) * limit;

  const whereClause: any = {
    name: { contains: search },
  };

  // ✅ Only filter by declaration if provided
  if (declaration) {
    whereClause.declaration = declaration;
  }

  const [data, total] = await Promise.all([
    prisma.jobApplicant.findMany({
      where: whereClause,
      include: { image: true, cv: true },
      orderBy: { createdAt: 'desc' }, // ✅ Latest applicants first
      skip,
      take: limit,
    }),
    prisma.jobApplicant.count({
      where: whereClause,
    }),
  ]);

  return NextResponse.json({ data, total, page }, { status: 200 });
}

export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData()

    console.log('--- RAW FORM DATA ENTRIES ---')
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`${key}: File(${value.name}, size=${value.size})`)
      } else {
        console.log(`${key}:`, value)
      }
    }

    const id = formData.get('id')
    console.log('ID value:', id, 'Type:', typeof id)

    if (!id || typeof id !== 'string') {
      console.log('❌ ID missing or not a string')
      return NextResponse.json({ error: 'ID is required and must be a string' }, { status: 400 })
    }

    // Build a plain object only from non-file entries so TypeScript doesn't complain.
    // Use `any` so we can coerce types freely before Zod validation.
    const fields: Record<string, any> = {}
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        // skip files for validation; we'll handle them separately below
        continue
      }
      // convert empty string -> undefined so partial updates don't fail
      fields[key] = value === '' ? undefined : value
    }

    // Coerce id-like fields from string -> number (only if they are strings)
    if (fields.imageId !== undefined && typeof fields.imageId === 'string') {
      const n = Number(fields.imageId)
      fields.imageId = Number.isNaN(n) ? undefined : n
    }
    if (fields.cvId !== undefined && typeof fields.cvId === 'string') {
      const n = Number(fields.cvId)
      fields.cvId = Number.isNaN(n) ? undefined : n
    }

    console.log('--- FIELDS OBJECT (for Zod) ---', fields)

    const parsed = updateApplicantSchema.safeParse(fields)
    console.log('--- ZOD PARSE RESULT ---')
    if (!parsed.success) {
      console.log('❌ Zod validation failed', parsed.error.errors)
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }
    console.log('✅ Parsed data:', parsed.data)

    const applicantId = parseInt(id, 10)
    console.log('Applicant ID (int):', applicantId)

    const existingApplicant = await prisma.jobApplicant.findUnique({
      where: { id: applicantId },
      include: { image: true, cv: true },
    })
    console.log('Existing applicant found:', !!existingApplicant)

    if (!existingApplicant) {
      return NextResponse.json({ error: 'Applicant not found' }, { status: 404 })
    }

    const image = formData.get('image')
    console.log('Image field type:', image instanceof File ? `File(${image.name}, size=${image.size})` : typeof image)

    const cv = formData.get('cv')
    console.log('CV field type:', cv instanceof File ? `File(${cv.name}, size=${cv.size})` : typeof cv)

    if (image instanceof File && image.size > 0) {
      if (existingApplicant.image?.publicId) {
        console.log('Deleting old image from Cloudinary:', existingApplicant.image.publicId)
        await deleteFromCloudinary(existingApplicant.image.publicId, 'image')
      }
      const result = await uploadToCloudinary(image, 'applicants/images')
      console.log('Uploaded new image to Cloudinary:', result)

      if (existingApplicant.image) {
        await prisma.applicantImage.update({
          where: { id: existingApplicant.image.id },
          data: {
            url: result.secure_url,
            publicId: result.public_id,
            alt: parsed.data.name || existingApplicant.name,
          },
        })
      } else {
        const imageData = await prisma.applicantImage.create({
          data: {
            url: result.secure_url,
            publicId: result.public_id,
            alt: parsed.data.name || existingApplicant.name,
          },
        })
        // Make sure parsed.data is mutable object from Zod result
        parsed.data.imageId = imageData.id
      }
    }

    if (cv instanceof File && cv.size > 0) {
      if (existingApplicant.cv?.publicId) {
        console.log('Deleting old CV from Cloudinary:', existingApplicant.cv.publicId)
        await deleteFromCloudinary(existingApplicant.cv.publicId, 'raw')
      }
      const result = await uploadToCloudinary(cv, 'applicants/cvs')
      console.log('Uploaded new CV to Cloudinary:', result)

      if (existingApplicant.cv) {
        await prisma.applicantCV.update({
          where: { id: existingApplicant.cv.id },
          data: {
            url: result.secure_url,
            publicId: result.public_id,
            alt: parsed.data.name || existingApplicant.name,
          },
        })
      } else {
        const cvData = await prisma.applicantCV.create({
          data: {
            url: result.secure_url,
            publicId: result.public_id,
            alt: parsed.data.name || existingApplicant.name,
          },
        })
        parsed.data.cvId = cvData.id
      }
    }

    const updatedApplicant = await prisma.jobApplicant.update({
      where: { id: applicantId },
      data: parsed.data,
    })
    console.log('✅ Applicant updated successfully')

    return NextResponse.json(updatedApplicant, { status: 200 })
  } catch (err) {
    console.error('❌ Update error:', err)
    return NextResponse.json({ error: 'Failed to update applicant' }, { status: 500 })
  }
}
