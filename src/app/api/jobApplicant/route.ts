import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { v2 as cloudinary } from 'cloudinary'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

interface CloudinaryUploadResult {
    public_id: string
    secure_url: string
    [key: string]: any // To support any extra properties returned by Cloudinary
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

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

async function uploadToCloudinary(file: File, folder: string): Promise<CloudinaryUploadResult> {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
            if (err || !result) {
                reject(err ?? new Error('No result returned from Cloudinary'))
            } else {
                resolve(result as CloudinaryUploadResult)
            }
        })
        uploadStream.end(buffer)
    })
}


export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }




        const formData = await request.formData()
        const fields = Object.fromEntries(formData.entries())
        const parsed = jobApplicantSchema.safeParse(fields)

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
        }

        const image = formData.get('image')
        const cv = formData.get('cv')

        let imageData = null
        let cvData = null

        if (image instanceof File) {
            const result = await uploadToCloudinary(image, 'applicants/images')
            imageData = await prisma.applicantImage.create({
                data: {
                    url: result.secure_url,
                    publicId: result.public_id,
                    alt: parsed.data.name,
                },
            })
        }

        if (cv instanceof File) {
            const result = await uploadToCloudinary(cv, 'applicants/cvs')
            cvData = await prisma.applicantCV.create({
                data: {
                    url: result.secure_url,
                    publicId: result.public_id,
                    alt: parsed.data.name,
                },
            })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const applicant = await prisma.jobApplicant.create({
            data: {
                ...parsed.data,
                imageId: imageData?.id ?? null,
                cvId: cvData?.id ?? null,
                userId: user.id,


            },
        })


        return NextResponse.json(applicant, { status: 201 })
    } catch (err) {
        console.error('Create error:', err)
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
            await cloudinary.uploader.destroy(applicant.image.publicId)
        }
        if (applicant.cv?.publicId) {
            await cloudinary.uploader.destroy(applicant.cv.publicId)
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
        const id = formData.get('id');
        if (typeof id !== 'string') {
            return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
        }


        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

        const fields = Object.fromEntries(formData.entries())
        const parsed = updateApplicantSchema.safeParse(fields)

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
        }

        const applicantId = parseInt(id)
        const existingApplicant = await prisma.jobApplicant.findUnique({
            where: { id: applicantId },
            include: { image: true, cv: true },
        })

        if (!existingApplicant) {
            return NextResponse.json({ error: 'Applicant not found' }, { status: 404 })
        }

        const image = formData.get('image')
        const cv = formData.get('cv')

        if (image instanceof File) {
            if (existingApplicant.image?.publicId) {
                await cloudinary.uploader.destroy(existingApplicant.image.publicId)
            }
            const result = await uploadToCloudinary(image, 'applicants/images')
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
                parsed.data.imageId = imageData.id
            }
        }

        if (cv instanceof File) {
            if (existingApplicant.cv?.publicId) {
                await cloudinary.uploader.destroy(existingApplicant.cv.publicId)
            }
            const result = await uploadToCloudinary(cv, 'applicants/cvs')
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

        return NextResponse.json(updatedApplicant, { status: 200 })
    } catch (err) {
        console.error('Update error:', err)
        return NextResponse.json({ error: 'Failed to update applicant' }, { status: 500 })
    }
}
