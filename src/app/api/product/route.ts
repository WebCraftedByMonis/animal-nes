import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { v2 as cloudinary } from 'cloudinary'
import { z } from 'zod'

interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  [key: string]: string | number | boolean
}

interface VariantInput {
  packingVolume: string
  companyPrice?: number
  dealerPrice?: number
  customerPrice: number
  inventory: number
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

async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  let attempt = 0
  while (attempt < retries) {
    try {
      return await fn()
    } catch (error) {
      attempt++
      if (attempt >= retries) throw error
      console.warn(`Retry attempt ${attempt} failed. Retrying in ${delay}ms...`)
      await new Promise(res => setTimeout(res, delay))
    }
  }
  throw new Error('All retry attempts failed.')
}


async function uploadFileToCloudinary(
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'raw' = 'image',
  originalFileName?: string
): Promise<CloudinaryUploadResult> {
  return retry(() =>
    new Promise((resolve, reject) => {
      const baseFileName = originalFileName
        ? originalFileName.replace(/\.[^/.]+$/, '')
        : `file-${Date.now()}`

      const extension = originalFileName?.split('.').pop() || 'pdf'
      const publicId = `${baseFileName}-${Date.now()}`

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          publicId,
          use_filename: true,
          unique_filename: false,
          format: extension,
        },
        (error, result) => {
          if (error) reject(new Error(error.message))
          else if (!result) reject(new Error('No result from Cloudinary'))
          else resolve(result)
        }
      )

      uploadStream.end(buffer)
    }),
    3, // retries
    1500 // delay (ms)
  )
}

// Zod schemas
const productSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  genericName: z.string().optional(),
  productLink: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  subCategory: z.string().min(1, 'Sub-category is required'),
  subsubCategory: z.string().min(1, 'Sub-sub-category is required'),
  productType: z.string().min(1, 'Product type is required'),
  companyId: z.number().min(1, 'Company ID is required'),
  partnerId: z.number().min(1, 'Partner ID is required'),
  description: z.string().optional(),
  dosage: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  outofstock: z.boolean().optional(),
  // REMOVED: companyPrice, dealerPrice, customerPrice, inventory, packingUnit
  // These belong to variants, not the main product
})

const updateProductSchema = productSchema.partial()

// Helper function for file uploads
async function handleFileUpload(file: File | null, type: 'image' | 'pdf') {
  if (!file) return null

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return uploadFileToCloudinary(
    buffer,
    `products/${type}s`,
    type === 'pdf' ? 'raw' : 'image',
    file.name
  )
}


export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    for (const [key, value] of formData.entries()) {
  console.log(`formData field: ${key} =>`, value);
}


    // Extract and validate product data
    const productData = {
  productName: formData.get('productName') as string,
  genericName: formData.get('genericName') as string | null,
  productLink: formData.get('productLink') as string | null,
  category: formData.get('category') as string,
  subCategory: formData.get('subCategory') as string,
  subsubCategory: formData.get('subsubCategory') as string,
  productType: formData.get('productType') as string,
  companyId: Number(formData.get('companyId')),
  partnerId: Number(formData.get('partnerId')),
  description: formData.get('description') as string | null,
  dosage: formData.get('dosage') as string | null,
  isFeatured: formData.get('isFeatured') === 'true',
  isActive: formData.get('isActive') === 'true',
  outofstock: formData.get('outofstock') === 'true',
  // REMOVED: companyPrice, dealerPrice, customerPrice, inventory, packingUnit
}

    const validation = productSchema.safeParse(productData)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    // Handle file uploads
    const [imageResult, pdfResult] = await Promise.all([
      handleFileUpload(formData.get('image') as File | null, 'image'),
      handleFileUpload(formData.get('pdf') as File | null, 'pdf')
    ])

const variants: VariantInput[] = []

for (let i = 0; ; i++) {
  const packingVolume = formData.get(`variants[${i}][packingVolume]`)
  if (!packingVolume) break

  variants.push({
    packingVolume: packingVolume.toString(),
    companyPrice: formData.get(`variants[${i}][companyPrice]`)
      ? Number(formData.get(`variants[${i}][companyPrice]`))
      : undefined,
    dealerPrice: formData.get(`variants[${i}][dealerPrice]`)
      ? Number(formData.get(`variants[${i}][dealerPrice]`))
      : undefined,
    customerPrice: Number(formData.get(`variants[${i}][customerPrice]`)),
    inventory: Number(formData.get(`variants[${i}][inventory]`)),
  })
}

console.log('Parsed variants:', variants)


    // Create product with relations
    const product = await prisma.$transaction(async (tx) => {
      // 1. Create base product
      const product = await tx.product.create({
        data: validation.data
      })

      console.log('Created product in DB:', product)
for (const variant of variants) {
  const createdVariant = await tx.productVariant.create({
    data: {
      ...variant,
      productId: product.id,
    },
  })
  console.log('Created variant in DB:', createdVariant)
}





      // 2. Create image if exists
      if (imageResult) {
        await tx.productImage.create({
          data: {
            url: imageResult.secure_url,
            alt: validation.data.productName,
            publicId: imageResult.public_id,
            productId: product.id
          }
        })
      }

      // 3. Create PDF if exists
      if (pdfResult) {
        await tx.productPdf.create({
          data: {
            url: pdfResult.secure_url,
            publicId: pdfResult.public_id,
            productId: product.id
          }
        })
      }

      return tx.product.findUnique({
    where: { id: product.id },
    include: { 
      image: true, 
      pdf: true,
      variants: true // Include variants in the response
    }
  })
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
     return NextResponse.json({ error: 'Product creation failed', details: String(error) }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const productId = parseInt(id)
    if (isNaN(productId)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    // Find product with relations
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { image: true, pdf: true }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Delete files from Cloudinary
    await Promise.all([
      product.image?.publicId ? cloudinary.uploader.destroy(product.image.publicId) : null,
      product.pdf?.publicId ? cloudinary.uploader.destroy(product.pdf.publicId, { resource_type: 'raw' }) : null
    ])

    // Delete product (relations will cascade)
    await prisma.product.delete({
      where: { id: productId }
    })

    return NextResponse.json(
      { message: 'Product deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const sortBy = searchParams.get('sortBy') || 'id'
  const sortOrder = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '10', 10)
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where: {
        OR: [
          { productName: { contains: search,  } },
          { genericName: { contains: search,  } }
        ]
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      include: {
        company: true,
        partner: true,
        image: true,
        pdf: true,
         variants: true,
      }
    }),
    prisma.product.count({
      where: {
        OR: [
          { productName: { contains: search,  } },
          { genericName: { contains: search, } }
        ]
      }
    })
  ])

  return NextResponse.json({
    data: items,
    total,
    page,
    lastSubmittedAt: items.length > 0 ? items[items.length - 1].createdAt ?? null : null,
  })
}

export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData()
    const id = formData.get('id') as string
    const productId = parseInt(id)

    if (isNaN(productId)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      )  
    }

    // Extract product data
     const productData = {
      productName: formData.get('productName') as string | null,
      genericName: formData.get('genericName') as string | null,
      productLink: formData.get('productLink') as string | null,
      category: formData.get('category') as string | null,
      subCategory: formData.get('subCategory') as string | null,
      subsubCategory: formData.get('subsubCategory') as string | null,
      productType: formData.get('productType') as string | null,
      companyId: formData.get('companyId') ? Number(formData.get('companyId')) : undefined,
      partnerId: formData.get('partnerId') ? Number(formData.get('partnerId')) : undefined,
      description: formData.get('description') as string | null,
      dosage: formData.get('dosage') as string | null,
      isFeatured: formData.get('isFeatured') ? formData.get('isFeatured') === 'true' : undefined,
      isActive: formData.get('isActive') ? formData.get('isActive') === 'true' : undefined,
      outofstock: formData.get('outofstock') ? formData.get('outofstock') === 'true' : undefined,
      // REMOVED all variant-specific fields
    }

    // Validate input
    const validation = updateProductSchema.safeParse(productData)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    // Get existing product
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { image: true, pdf: true }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Handle file uploads
    const [imageResult, pdfResult] = await Promise.all([
      handleFileUpload(formData.get('image') as File | null, 'image'),
      handleFileUpload(formData.get('pdf') as File | null, 'pdf')
    ])
const variants: VariantInput[] = []

for (let i = 0; ; i++) {
  const packingVolume = formData.get(`variants[${i}][packingVolume]`)
  if (!packingVolume) break

  variants.push({
    packingVolume: packingVolume.toString(),
    companyPrice: formData.get(`variants[${i}][companyPrice]`)
      ? Number(formData.get(`variants[${i}][companyPrice]`))
      : undefined,
    dealerPrice: formData.get(`variants[${i}][dealerPrice]`)
      ? Number(formData.get(`variants[${i}][dealerPrice]`))
      : undefined,
    customerPrice: Number(formData.get(`variants[${i}][customerPrice]`)),
    inventory: Number(formData.get(`variants[${i}][inventory]`)),
  })
}



    // Update product with transactions
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Update product data
       await tx.product.update({
        where: { id: productId },
        data: validation.data,
        include: { image: true, pdf: true }
      })

await tx.productVariant.deleteMany({
  where: { productId },
})

for (const variant of variants) {
  await tx.productVariant.create({
    data: {
      ...variant,
      productId,
    },
  })
}


      // Handle image update
      if (imageResult) {
        // Delete old image
        if (existingProduct.image?.publicId) {
          await cloudinary.uploader.destroy(existingProduct.image.publicId)
        }

        await tx.productImage.upsert({
          where: { productId },
          create: {
            url: imageResult.secure_url,
            alt: productData.productName || existingProduct.productName,
            publicId: imageResult.public_id,
            productId
          },
          update: {
            url: imageResult.secure_url,
            alt: productData.productName || existingProduct.productName,
            publicId: imageResult.public_id
          }
        })
      }

      // Handle PDF update
      if (pdfResult) {
        // Delete old PDF
        if (existingProduct.pdf?.publicId) {
          await cloudinary.uploader.destroy(existingProduct.pdf.publicId, { resource_type: 'raw' })
        }

        await tx.productPdf.upsert({
          where: { productId },
          create: {
            url: pdfResult.secure_url,
            publicId: pdfResult.public_id,
            productId
          },
          update: {
            url: pdfResult.secure_url,
            publicId: pdfResult.public_id
          }
        })
      }

      return tx.product.findUnique({
        where: { id: productId },
        include: { image: true, pdf: true }
      })
    })

    return NextResponse.json(updatedProduct, { status: 200 })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}