import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadImage, uploadPDF, deleteFromCloudinary } from '@/lib/cloudinary'

// Configure route to handle larger payloads (up to 50MB)
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds for file processing

async function handleFileUpload(file: File | null, type: 'image' | 'pdf') {
  if (!file) {
    console.log(`⏭️ [SERVER] No ${type} file to upload`)
    return null
  }
  
  console.log(`📁 [SERVER] Processing ${type} file: ${file.name} (${file.size} bytes)`)
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log(`☁️ [SERVER] Uploading ${type} to Cloudinary...`)
    
    const result = type === 'pdf' 
      ? await uploadPDF(buffer, `animal-news/${type}s`, file.name)
      : await uploadImage(buffer, `animal-news/${type}s`, file.name)
    
    console.log(`✅ [SERVER] ${type} upload successful: ${result.public_id}`)
    return result
  } catch (error) {
    console.error(`❌ [SERVER] ${type} upload failed:`, error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  console.log('🚀 [SERVER] Starting animal news creation API call');
  try {
    console.log('📋 [SERVER] Parsing form data...');
    const formData = await req.formData()

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const name = (formData.get('name') as string) || null
    const whatsapp = (formData.get('whatsapp') as string) || null
    const email = (formData.get('email') as string) || null
    const image = formData.get('image') as File | null
    const pdf = formData.get('pdf') as File | null

    console.log('📩 [SERVER] Incoming form data:')
    console.log('  Title:', title)
    console.log('  Description length:', description?.length || 0)
    console.log('  Name:', name)
    console.log('  WhatsApp:', whatsapp)
    console.log('  Email:', email)
    console.log('  Image file:', image ? `${image.name}, ${image.size} bytes, type: ${image.type}` : 'No image')
    console.log('  PDF file:', pdf ? `${pdf.name}, ${pdf.size} bytes, type: ${pdf.type}` : 'No PDF')

    // Validation checks
    if (!title || !description || !image) {
      console.error('❌ [SERVER] Validation failed - missing required fields', {
        hasTitle: !!title,
        hasDescription: !!description,
        hasImage: !!image
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('📤 [SERVER] Starting file uploads...');

    const [imageResult, pdfResult] = await Promise.all([
      handleFileUpload(image, 'image'),
      handleFileUpload(pdf, 'pdf'),
    ])

    console.log('✅ [SERVER] File upload results:')
    console.log('  Image upload:', imageResult ? `✅ ${imageResult.secure_url}` : '❌ Failed')
    console.log('  PDF upload:', pdfResult ? `✅ ${pdfResult.secure_url}` : 'No PDF uploaded')
    
    console.log('💾 [SERVER] Starting database transaction...');

    const news = await prisma.$transaction(async (tx) => {
      const imageRecord = imageResult
        ? await tx.newsImage.create({
            data: {
              url: imageResult.secure_url,
              publicId: imageResult.public_id,
              alt: title,
            },
          })
        : null

      const pdfRecord = pdfResult
        ? await tx.newsPdf.create({
            data: {
              url: pdfResult.secure_url,
              publicId: pdfResult.public_id,
              title,
            },
          })
        : null

      console.log('📦 [SERVER] Creating Animal News entry with:')
      console.log('  Image ID:', imageRecord?.id || 'No image')
      console.log('  PDF ID:', pdfRecord?.id || 'No PDF')

      return tx.animalNews.create({
        data: {
          title,
          description,
          name,
          whatsapp,
          email,
          imageId: imageRecord?.id,
          pdfId: pdfRecord?.id,
        },
        include: { image: true, pdf: true },
      })
    })

    console.log('🎉 [SERVER] News created successfully!', {
      id: news.id,
      title: news.title,
      hasImage: !!news.image,
      hasPdf: !!news.pdf,
      createdAt: news.createdAt
    })

    return NextResponse.json(news, { status: 201 })
  } catch (error: any) {
    console.error('💥 [SERVER] Error creating animal news:', {
      error: error?.message || error,
      stack: error?.stack,
      name: error?.name
    })
    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message || error },
      { status: 500 }
    )
  } finally {
    console.log('🏁 [SERVER] Animal news creation API call finished')
  }
}
// GET - List news entries
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '10', 10)
  const skip = (page - 1) * limit

  const [data, total] = await Promise.all([
    prisma.animalNews.findMany({
      where: {
        title: {
          contains: search,
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        image: true,
        pdf: true,
      },
    }),
    prisma.animalNews.count(),
  ])

  return NextResponse.json({ data, total, page })
}

// DELETE - Delete news entry
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = Number(searchParams.get('id'))

  if (!id || isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  try {
    const existing = await prisma.animalNews.findUnique({
      where: { id },
      include: { image: true, pdf: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await Promise.all([
      existing.image?.publicId && deleteFromCloudinary(existing.image.publicId, 'image'),
      existing.pdf?.publicId && deleteFromCloudinary(existing.pdf.publicId, 'raw'),
    ])

    await prisma.animalNews.delete({ where: { id } })

    return NextResponse.json({ message: 'Deleted successfully' })
  } catch (error) {
    console.error('Error deleting news:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PUT - Update news entry
export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData()
    const id = parseInt(formData.get('id') as string)

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const name = (formData.get('name') as string) || null
    const whatsapp = (formData.get('whatsapp') as string) || null
    const email = (formData.get('email') as string) || null
    const image = formData.get('image') as File | null
    const pdf = formData.get('pdf') as File | null

    const existing = await prisma.animalNews.findUnique({
      where: { id },
      include: { image: true, pdf: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const [imageResult, pdfResult] = await Promise.all([
      handleFileUpload(image, 'image'),
      handleFileUpload(pdf, 'pdf'),
    ])

    const updated = await prisma.$transaction(async (tx) => {
      let imageRecord = existing.image
      let pdfRecord = existing.pdf

      if (imageResult) {
        if (imageRecord?.publicId) {
          await deleteFromCloudinary(imageRecord.publicId, 'image')
        }

        imageRecord = await tx.newsImage.upsert({
          where: { id: existing.imageId ?? 0 },
          update: {
            url: imageResult.secure_url,
            publicId: imageResult.public_id,
            alt: title,
          },
          create: {
            url: imageResult.secure_url,
            publicId: imageResult.public_id,
            alt: title,
          },
        })
      }

      if (pdfResult) {
        if (pdfRecord?.publicId) {
          await deleteFromCloudinary(pdfRecord.publicId, 'raw')
        }

        pdfRecord = await tx.newsPdf.upsert({
          where: { id: existing.pdfId ?? 0 },
          update: {
            url: pdfResult.secure_url,
            publicId: pdfResult.public_id,
            title,
          },
          create: {
            url: pdfResult.secure_url,
            publicId: pdfResult.public_id,
            title,
          },
        })
      }

      return tx.animalNews.update({
        where: { id },
        data: {
          title,
          description,
          name,
          whatsapp,
          email,
          imageId: imageRecord?.id,
          pdfId: pdfRecord?.id,
        },
        include: { image: true, pdf: true },
      })
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating news:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
