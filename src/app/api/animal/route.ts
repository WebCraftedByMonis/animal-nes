import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { v2 as cloudinary } from 'cloudinary'
import { authOptions } from '../auth/[...nextauth]/route'
import { Gender, AnimalStatus } from '@prisma/client'

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

    const breedId = parseInt(formData.get('breedId') as string)
    const name = formData.get('name') as string
    const gender = formData.get('gender') as Gender
    const castrated = formData.get('castrated') === 'true'
    const vetCertificate = formData.get('vetCertificate') === 'true'
    const age = formData.get('age') as string
    const weight = parseFloat(formData.get('weight') as string)
    const totalPrice = parseFloat(formData.get('totalPrice') as string)
    const location = formData.get('location') as string
    const quantity = parseInt(formData.get('quantity') as string)
    const addedBy = session.user.email

    const imageFile = formData.get('image') as File | null
    const videoFile = formData.get('video') as File | null

    if (!imageFile) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 })
    }

    // Upload image
    const arrayBufferImage = await imageFile.arrayBuffer()
    const bufferImage = Buffer.from(arrayBufferImage)
    const imageUpload: any = await uploadToCloudinary(bufferImage, 'image')

    // Optional: upload video
    let videoUpload: any = null
    if (videoFile) {
      const arrayBufferVideo = await videoFile.arrayBuffer()
      const bufferVideo = Buffer.from(arrayBufferVideo)
      videoUpload = await uploadToCloudinary(bufferVideo, 'video')
    }

    const animal = await prisma.animal.create({
      data: {
        name,
        gender,
        age,
        weight,
        totalPrice,
        status: AnimalStatus.AVAILABLE,
        castrated,
        vetCertificate,
        quantity,
        location,
        addedBy,
        breed: {
          connect: { id: breedId },
        },
        images: {
          create: [
            {
              url: imageUpload.secure_url,
              alt: name,
              publicId: imageUpload.public_id,
            },
          ],
        },
        video: videoUpload
          ? {
              create: {
                url: videoUpload.secure_url,
                publicId: videoUpload.public_id,
              },
            }
          : undefined,
      },
    })

    return NextResponse.json(animal, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
