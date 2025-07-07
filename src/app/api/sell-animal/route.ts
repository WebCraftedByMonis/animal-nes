import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { v2 as cloudinary } from 'cloudinary'
import { authOptions } from '../auth/[...nextauth]/route'
import { Prisma, SellStatus } from '@prisma/client'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

async function uploadToCloudinary(buffer: Buffer, type: 'image' | 'video') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'animals',
        resource_type: type,
      },
      (error, result) => {
        if (error) return reject(error)
        resolve(result)
      }
    )
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

    const specie = formData.get('specie') as string
    const breed = formData.get('breed') as string
    const location = formData.get('location') as string
    const quantity = parseInt(formData.get('quantity') as string)
    const ageType = formData.get('ageType') as 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS'
    const ageNumber = parseInt(formData.get('ageNumber') as string)
    const weightType = formData.get('weightType') as 'GRAMS' | 'KGS' | 'MUNS' | 'TONS'
    const weightValue = parseFloat(formData.get('weightValue') as string)
    const gender = formData.get('gender') as 'MALE' | 'FEMALE'
   
    const healthCertificate = formData.get('healthCertificate') === 'true'
    const totalPrice = parseFloat(formData.get('totalPrice') as string)
    const purchasePrice = parseFloat(formData.get('purchasePrice') as string)
    const referredBy = formData.get('referredBy') as string | null

    const imageFile = formData.get('image') as File | null
    const videoFile = formData.get('video') as File | null

    if (!imageFile) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 })
    }

    const arrayBufferImage = await imageFile.arrayBuffer()
    const bufferImage = Buffer.from(arrayBufferImage)
    const imageUpload: any = await uploadToCloudinary(bufferImage, 'image')

    let videoUpload: any = null
    if (videoFile && videoFile.size > 0) {
      const arrayBufferVideo = await videoFile.arrayBuffer()
      const bufferVideo = Buffer.from(arrayBufferVideo)
      videoUpload = await uploadToCloudinary(bufferVideo, 'video')
    }

    const result = await prisma.sellAnimal.create({
      data: {
       
        specie,
        breed,
        quantity,
        location,
        ageType,
        ageNumber,
        weightType,
        weightValue,
        gender,
        
        healthCertificate,
        totalPrice,
        purchasePrice,
        referredBy,
        status: 'PENDING',
        user: {
          connect: { email: session.user.email },
        },
        images: {
          create: [
            {
              url: imageUpload.secure_url,
              alt: specie,
              publicId: imageUpload.public_id,
            },
          ],
        },
        videos: videoUpload
          ? {
              create: [
                {
                  url: videoUpload.secure_url,
                  alt: specie,
                  publicId: videoUpload.public_id,
                },
              ],
            }
          : undefined,
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const sort = searchParams.get('sort') || 'desc'
    const rawStatus = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const status = rawStatus && ['PENDING', 'ACCEPTED', 'REJECTED'].includes(rawStatus)
      ? rawStatus as SellStatus
      : undefined

    const where: Prisma.SellAnimalWhereInput = {
    
      ...(status ? { status } : {}),
      OR: q
        ? [
            { specie: { contains: q } },
            { breed: { contains: q } },
            { location: { contains: q } },
            { user: { name: { contains: q } } },
          ]
        : undefined,
    }

    const animals = await prisma.sellAnimal.findMany({
      where,
      include: {
        user: true,
        images: true,
        videos: true,
      },
      orderBy: { createdAt: sort === 'asc' ? 'asc' : 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await prisma.sellAnimal.count({ where })

    return NextResponse.json({
      items: animals,
      total,
    })

  } catch (error) {
    console.error('GET error', error)
    return NextResponse.json(
      { error: 'Failed to fetch filtered animal records' },
      { status: 500 }
    )
  }
}


export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, status } = await request.json()

    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updated = await prisma.sellAnimal.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    console.error('PUT error', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
