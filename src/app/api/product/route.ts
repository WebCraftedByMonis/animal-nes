import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { v2 as cloudinary } from 'cloudinary'
import { z } from 'zod'

interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  [key: string]: unknown
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


async function uploadImageToCloudinary(buffer: Buffer, folder: string): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder: folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) reject(new Error(error.message))
        else if (!result) reject(new Error('No result from Cloudinary'))
        else resolve(result)
      }
    )
    uploadStream.end(buffer)
  })
}

async function uploadPdfToCloudinary(buffer: Buffer, folder: string): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder: folder,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) reject(new Error(error.message))
        else if (!result) reject(new Error('No result from Cloudinary'))
        else resolve(result)
      }
    )
    uploadStream.end(buffer)
  })
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

})

const updateProductSchema = productSchema.partial()

// Helper function for file uploads
async function handleFileUpload(file: File | null, type: 'image' | 'pdf') {
  if (!file) return null

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (type === 'image') {
    return uploadImageToCloudinary(buffer, 'products/images')
  } else {
    return uploadPdfToCloudinary(buffer, 'products/pdfs')
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

  
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value)
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
    }

    console.log('--- Parsed Product Data ---', productData)

    const validation = productSchema.safeParse(productData)
    if (!validation.success) {
      console.error('Product data validation failed:', validation.error.errors)
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

      const variant: VariantInput = {
        packingVolume: packingVolume.toString(),
        companyPrice: formData.get(`variants[${i}][companyPrice]`)
          ? Number(formData.get(`variants[${i}][companyPrice]`))
          : undefined,
        dealerPrice: formData.get(`variants[${i}][dealerPrice]`)
          ? Number(formData.get(`variants[${i}][dealerPrice]`))
          : undefined,
        customerPrice: Number(formData.get(`variants[${i}][customerPrice]`)),
        inventory: Number(formData.get(`variants[${i}][inventory]`)),
      }

      variants.push(variant)
    }

    console.log('--- Parsed Variants ---', variants)

    // Create product with relations
    const product = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: validation.data
      })

      for (const variant of variants) {
        await tx.productVariant.create({
          data: {
            ...variant,
            productId: product.id,
          },
        })
      }

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
          variants: true
        }
      })
    })

    console.log('--- Final Created Product ---', product)

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
      product.pdf?.publicId ? cloudinary.uploader.destroy(product.pdf.publicId, { resource_type: 'auto' }) : null
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
  
  // Pagination params
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '16', 10)
  const skip = (page - 1) * limit
  
  // Sort params
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
  
  // Filter params
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const subCategory = searchParams.get('subCategory') || ''
  const subsubCategory = searchParams.get('subsubCategory') || ''
  const productType = searchParams.get('productType') || ''
  const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined
  const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined

  // Build where clause
  const where: any = {
    isActive: true, // Always filter for active products
  }

  // Search filter - searches across multiple fields
  // In MySQL, contains is case-insensitive by default
  if (search) {
    where.OR = [
      { productName: { contains: search } },
      { genericName: { contains: search } },
      { description: { contains: search } },
      { dosage: { contains: search } },
    ]
  }

  // Category filters
  if (category && category !== 'all') {
    where.category = category
  }
  if (subCategory && subCategory !== 'all') {
    where.subCategory = subCategory
  }
  if (subsubCategory && subsubCategory !== 'all') {
    where.subsubCategory = subsubCategory
  }
  if (productType && productType !== 'all') {
    where.productType = productType
  }

  // Price filter - this is a bit complex as price is in variants
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.variants = {
      some: {
        customerPrice: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        }
      }
    }
  }

  // Build orderBy
  let orderBy: any = {}
  if (sortBy === 'createdAt') {
    orderBy = { createdAt: sortOrder }
  } else if (sortBy === 'productName') {
    orderBy = { productName: sortOrder }
  }

  try {
    // Execute queries
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
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
      prisma.product.count({ where })
    ])

    // Get min and max prices for the price range slider
    const priceStats = await prisma.productVariant.aggregate({
      _min: { customerPrice: true },
      _max: { customerPrice: true },
      where: {
        product: {
          isActive: true
        }
      }
    })

    return NextResponse.json({
      data: items,
      total,
      page,
      limit,
      minPrice: priceStats._min.customerPrice || 0,
      maxPrice: priceStats._max.customerPrice || 100000,
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}


export async function PUT(request: NextRequest) {
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

    const formData = await request.formData()
    
    
    for (const [key, value] of formData.entries()) {
      
    }

    // Extract product data
    const productData = {
      productName: formData.get('productName') as string | null,
      genericName: formData.get('genericName') as string | null,
      productLink: formData.get('productLink') as string | null, // Fixed: capital L
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
    }

    

    // Filter out undefined values for validation
    const cleanedProductData = Object.fromEntries(
  Object.entries(productData)
    .map(([key, value]) => [key, value === null ? undefined : value])
    .filter(([_, value]) => value !== undefined)
)

    // Validate input
    const validation = updateProductSchema.safeParse(cleanedProductData)
    if (!validation.success) {
      console.error('Validation failed:', validation.error.errors)
      return NextResponse.json(
        { error: validation.error.errors[0].message, errors: validation.error.errors },
        { status: 400 }
      )
    }

    // Get existing product
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { image: true, pdf: true, variants: true }
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

   

    // Parse variants
    const variants: VariantInput[] = []
    for (let i = 0; ; i++) {
      const packingVolume = formData.get(`variants[${i}][packingVolume]`)
      if (!packingVolume) break

      const variant: VariantInput = {
        packingVolume: packingVolume.toString(),
        customerPrice: Number(formData.get(`variants[${i}][customerPrice]`) || 0),
        inventory: Number(formData.get(`variants[${i}][inventory]`) || 0)
      }

      // Handle optional prices
      const companyPrice = formData.get(`variants[${i}][companyPrice]`)
      const dealerPrice = formData.get(`variants[${i}][dealerPrice]`)
      
      if (companyPrice && companyPrice !== '') {
        variant.companyPrice = Number(companyPrice)
      }
      if (dealerPrice && dealerPrice !== '') {
        variant.dealerPrice = Number(dealerPrice)
      }

      variants.push(variant)
    }

    

    // Update product with transactions
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Update product data
      const updated = await tx.product.update({
        where: { id: productId },
        data: validation.data,
      })

      

      // Delete existing variants and create new ones
      if (variants.length > 0) {
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

       
      }

      // Handle image update
      if (imageResult) {
        // Delete old image from Cloudinary
        if (existingProduct.image?.publicId) {
          try {
            await cloudinary.uploader.destroy(existingProduct.image.publicId)
            
          } catch (error) {
            console.error('Failed to delete old image:', error)
          }
        }

        await tx.productImage.upsert({
          where: { productId },
          create: {
            url: imageResult.secure_url,
            alt: cleanedProductData.productName || existingProduct.productName,
            publicId: imageResult.public_id,
            productId
          },
          update: {
            url: imageResult.secure_url,
            alt: cleanedProductData.productName || existingProduct.productName,
            publicId: imageResult.public_id
          }
        })

        
      }

      // Handle PDF update
      if (pdfResult) {
        // Delete old PDF from Cloudinary
        if (existingProduct.pdf?.publicId) {
          try {
            await cloudinary.uploader.destroy(existingProduct.pdf.publicId, { resource_type: 'image' })
            
          } catch (error) {
            console.error('Failed to delete old PDF:', error)
          }
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

      // Return the updated product with all relations
      return tx.product.findUnique({
        where: { id: productId },
        include: { 
          image: true, 
          pdf: true,
          variants: true,
          company: true,
          partner: true
        }
      })
    })

    

    return NextResponse.json(updatedProduct, { status: 200 })
  } catch (error) {
    console.error('Error updating product:', error)
    
    // More detailed error response
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Failed to update product', 
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}