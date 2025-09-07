import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { v2 as cloudinary } from 'cloudinary'
import { Prisma, SellStatus } from '@prisma/client'

// Configure route to handle larger payloads (up to 50MB)
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds for file processing

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

async function deleteFromCloudinary(publicId: string, resourceType: 'image' | 'video' = 'image') {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
  } catch (error) {
    console.error('Failed to delete from Cloudinary:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
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
    // Skip auth check for viewing page as requested
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const sort = searchParams.get('sort') || 'createdAt'
    const order = searchParams.get('order') || 'desc'
    const rawStatus = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const status = rawStatus && ['PENDING', 'ACCEPTED', 'REJECTED'].includes(rawStatus)
      ? rawStatus as SellStatus
      : undefined

    // Auto-delete animals older than 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    try {
      // Find expired animals
      const expiredAnimals = await prisma.sellAnimal.findMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo
          }
        },
        include: {
          images: true,
          videos: true,
        }
      })

      // Delete expired animals and their media
      for (const animal of expiredAnimals) {
        // Delete images from Cloudinary
        for (const image of animal.images) {
          if (image.publicId) {
            await deleteFromCloudinary(image.publicId, 'image')
          }
        }
        // Delete videos from Cloudinary
        for (const video of animal.videos) {
          if (video.publicId) {
            await deleteFromCloudinary(video.publicId, 'video')
          }
        }
        // Delete from database
        await prisma.sellAnimal.delete({
          where: { id: animal.id }
        })
      }
    } catch (deleteError) {
      console.error('Error deleting expired animals:', deleteError)
      // Continue with the GET request even if auto-delete fails
    }

    const where: Prisma.SellAnimalWhereInput = {
      ...(status ? { status } : {}),
      OR: q
        ? [
            { specie: { contains: q, } },
            { breed: { contains: q,  } },
            { location: { contains: q,  } },
          ]
        : undefined,
    }

    // Build dynamic orderBy
    let orderBy: any = {}
    switch (sort) {
      case 'specie':
        orderBy = { specie: order }
        break
      case 'totalPrice':
        orderBy = { totalPrice: order }
        break
      case 'id':
        orderBy = { id: order }
        break
      case 'createdAt':
      default:
        orderBy = { createdAt: order }
        break
    }

    const animals = await prisma.sellAnimal.findMany({
      where,
      include: {
        user: true,
        images: true,
        videos: true,
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await prisma.sellAnimal.count({ where })

    // Return data directly without transformation
    return NextResponse.json({
      items: animals,
      total,
    })

  } catch (error) {
    console.error('GET error', error)
    return NextResponse.json(
      { error: 'Failed to fetch animal records' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // For admin panel, temporarily skip auth
    const formData = await request.formData()
    const id = parseInt(formData.get('id') as string)

    if (!id) {
      return NextResponse.json({ error: 'Animal ID is required' }, { status: 400 })
    }

    // Check if animal exists
    const existingAnimal = await prisma.sellAnimal.findUnique({
      where: { id },
      include: { 
        images: true,
        videos: true 
      },
    })

    if (!existingAnimal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }

    // Build update data
    const updateData: any = {}

    const specie = formData.get('specie') as string
    const breed = formData.get('breed') as string
    const location = formData.get('location') as string
    const quantity = formData.get('quantity') as string
    const ageType = formData.get('ageType') as string
    const ageNumber = formData.get('ageNumber') as string
    const weightType = formData.get('weightType') as string
    const weightValue = formData.get('weightValue') as string
    const gender = formData.get('gender') as string
    const healthCertificate = formData.get('healthCertificate') as string
    const totalPrice = formData.get('totalPrice') as string
    const purchasePrice = formData.get('purchasePrice') as string
    const referredBy = formData.get('referredBy') as string
    const status = formData.get('status') as string

    if (specie) updateData.specie = specie
    if (breed) updateData.breed = breed
    if (location) updateData.location = location
    if (quantity) updateData.quantity = parseInt(quantity)
    if (ageType) updateData.ageType = ageType
    if (ageNumber) updateData.ageNumber = parseInt(ageNumber)
    if (weightType) updateData.weightType = weightType
    if (weightValue) updateData.weightValue = parseFloat(weightValue)
    if (gender) updateData.gender = gender
    if (healthCertificate !== undefined) updateData.healthCertificate = healthCertificate === 'true'
    if (totalPrice) updateData.totalPrice = parseFloat(totalPrice)
    if (purchasePrice) updateData.purchasePrice = parseFloat(purchasePrice)
    if (referredBy !== undefined) updateData.referredBy = referredBy || null
    
    if (status) {
      const statusUpper = status.toUpperCase()
      if (['PENDING', 'ACCEPTED', 'REJECTED'].includes(statusUpper)) {
        updateData.status = statusUpper
      }
    }

    // Handle image update
    const imageFile = formData.get('image') as File | null
    if (imageFile && imageFile.size > 0) {
      // Delete old image from Cloudinary
      if (existingAnimal.images[0]?.publicId) {
        await deleteFromCloudinary(existingAnimal.images[0].publicId, 'image')
      }

      // Upload new image
      const arrayBufferImage = await imageFile.arrayBuffer()
      const bufferImage = Buffer.from(arrayBufferImage)
      const imageUpload: any = await uploadToCloudinary(bufferImage, 'image')

      // Delete old image records
      await prisma.sellAnimalImage.deleteMany({
        where: { sellAnimalId: id }
      })

      // Create new image
      updateData.images = {
        create: [
          {
            url: imageUpload.secure_url,
            alt: specie || existingAnimal.specie,
            publicId: imageUpload.public_id,
          },
        ],
      }
    }

    // Update the animal
    const updated = await prisma.sellAnimal.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
        images: true,
        videos: true,
      },
    })

    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    console.error('PUT error', error)
    return NextResponse.json({ error: 'Failed to update animal' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // For admin panel, temporarily skip auth
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id') || '0')

    if (!id) {
      return NextResponse.json({ error: 'Animal ID is required' }, { status: 400 })
    }

    // Get animal with media for cleanup
    const animal = await prisma.sellAnimal.findUnique({
      where: { id },
      include: { 
        images: true,
        videos: true 
      },
    })

    if (!animal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }

    // Delete images from Cloudinary
    for (const image of animal.images) {
      if (image.publicId) {
        await deleteFromCloudinary(image.publicId, 'image')
      }
    }

    // Delete videos from Cloudinary
    for (const video of animal.videos) {
      if (video.publicId) {
        await deleteFromCloudinary(video.publicId, 'video')
      }
    }

    // Delete the animal (cascades to images and videos)
    await prisma.sellAnimal.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Animal deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('DELETE error', error)
    return NextResponse.json({ error: 'Failed to delete animal' }, { status: 500 })
  }
}