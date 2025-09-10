import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadImage, uploadRawFile } from '@/lib/cloudinary'
import { Gender, SellStatus, AgeType, WeightType } from '@prisma/client'

async function uploadToCloudinary(buffer: Buffer, type: 'image' | 'video', originalFileName?: string) {
  if (type === 'image') {
    return uploadImage(buffer, 'animals', originalFileName)
  } else {
    return uploadRawFile(buffer, 'animals', originalFileName)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()

    const specie = formData.get('specie') as string
    const breed = formData.get('breed') as string
    const gender = formData.get('gender') as Gender
    const healthCertificate = formData.get('healthCertificate') === 'true'
    const ageNumber = parseInt(formData.get('ageNumber') as string)
    const ageType = formData.get('ageType') as AgeType
    const weightValue = parseFloat(formData.get('weightValue') as string)
    const weightType = formData.get('weightType') as WeightType
    const totalPrice = parseFloat(formData.get('totalPrice') as string)
    const purchasePrice = parseFloat(formData.get('purchasePrice') as string)
    const location = formData.get('location') as string
    const quantity = parseInt(formData.get('quantity') as string) || 1
    const referredBy = formData.get('referredBy') as string | null

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

    const sellAnimal = await prisma.sellAnimal.create({
      data: {
        specie,
        breed,
        gender,
        ageNumber,
        ageType,
        weightValue,
        weightType,
        totalPrice,
        purchasePrice,
        healthCertificate,
        quantity,
        location,
        referredBy,
        status: SellStatus.PENDING,
        userId: session.user.id,
        images: {
          create: [
            {
              url: imageUpload.secure_url,
              alt: `${specie} - ${breed}`,
              publicId: imageUpload.public_id,
            },
          ],
        },
        videos: videoUpload
          ? {
              create: [
                {
                  url: videoUpload.secure_url,
                  alt: `${specie} - ${breed} video`,
                  publicId: videoUpload.public_id,
                },
              ],
            }
          : undefined,
      },
    })

    return NextResponse.json(sellAnimal, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
