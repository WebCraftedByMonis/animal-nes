import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadImage, uploadPDF, deleteFromCloudinary } from '@/lib/cloudinary'
import { validateAdminSession } from '@/lib/auth/admin-auth'
import { cached } from '@/lib/cache'
import { z } from 'zod'

// Configure route to handle larger payloads (up to 50MB)
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds for file processing

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

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Helper function for file uploads
async function handleFileUpload(file: File | null, type: 'image' | 'pdf') {
  if (!file || file.size === 0) return null

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (type === 'image') {
    return uploadImage(buffer, 'products/images', file.name)
  } else {
    return uploadPDF(buffer, 'products/pdfs', file.name)
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin-token')?.value
    const admin = await validateAdminSession(adminToken)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    const imageUrlField = (formData.get('imageUrl') as string | null)?.trim() || null
    const imageAltField = (formData.get('imageAlt') as string | null)?.trim() || null
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

    // Additional categories the product also shows up under, on top of the
    // required primary `category` above (see ProductCategory in the
    // schema). Sent as repeated `additionalCategories` form fields.
    const additionalCategories = [...new Set(
      formData.getAll('additionalCategories')
        .map((v) => v.toString().trim())
        .filter((v) => v && v !== validation.data.category)
    )]

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

      if (additionalCategories.length > 0) {
        await tx.productCategory.createMany({
          data: additionalCategories.map((category) => ({ productId: product.id, category })),
        })
      }

      if (imageResult) {
        await tx.productImage.create({
          data: {
            url: imageResult.secure_url,
            alt: imageAltField || validation.data.productName,
            publicId: imageResult.public_id,
            productId: product.id
          }
        })
      } else if (imageUrlField) {
        await tx.productImage.create({
          data: {
            url: imageUrlField,
            alt: imageAltField || validation.data.productName,
            publicId: null,
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
          variants: true,
          categories: true
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
    const ids = searchParams.get('ids')

    // Bulk delete
    if (ids) {
      const productIds = ids.split(',').map(Number).filter(n => !isNaN(n))
      if (productIds.length === 0) {
        return NextResponse.json({ error: 'No valid product IDs provided' }, { status: 400 })
      }

      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { image: true, pdf: true }
      })

      const cloudinaryDeletes = products.flatMap(p => [
        p.image?.publicId ? deleteFromCloudinary(p.image.publicId, 'image') : null,
        p.pdf?.publicId ? deleteFromCloudinary(p.pdf.publicId, 'raw') : null,
      ]).filter((p): p is Promise<unknown> => p !== null)

      if (cloudinaryDeletes.length > 0) {
        await Promise.all(cloudinaryDeletes)
      }

      await prisma.product.deleteMany({ where: { id: { in: productIds } } })

      return NextResponse.json({ message: `${productIds.length} products deleted` }, { status: 200 })
    }

    // Single delete
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

    // Delete files from Cloudinary (only if hosted there — external URL images have no publicId)
    const toDelete = [
      product.image?.publicId ? deleteFromCloudinary(product.image.publicId, 'image') : null,
      product.pdf?.publicId ? deleteFromCloudinary(product.pdf.publicId, 'raw') : null,
    ].filter((p): p is Promise<unknown> => p !== null)

    if (toDelete.length > 0) {
      await Promise.all(toDelete)
    }

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

// Weighted, multi-field relevance score for one candidate against a search
// query — exact/prefix/whole-word matches on the product name count for far
// more than an incidental substring hit buried in a description. Ties are
// broken by the ranking engine's score (src/lib/ranking.ts) at the call
// site, so among equally relevant matches the more popular one wins — the
// same "text relevance + behavioral signals" combination the guide's
// Search Engine section describes.
function scoreSearchMatch(
  product: {
    productName: string
    genericName: string | null
    category?: string | null
    subCategory?: string | null
    subsubCategory?: string | null
    productType?: string | null
  },
  query: string
): number {
  const name = product.productName.toLowerCase()
  const generic = (product.genericName || '').toLowerCase()
  const categoryFields = [product.category, product.subCategory, product.subsubCategory, product.productType]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const q = query.toLowerCase().trim()
  if (!q) return 0

  if (name === q) return 100
  if (name.startsWith(q)) return 60
  if (name.includes(q)) return 40

  const tokens = q.split(/\s+/).filter(Boolean)
  let score = 0
  for (const token of tokens) {
    if (name.includes(token)) score += 20
    if (generic.includes(token)) score += 10
    // A category match ("vaccine" → category "Vaccines & Immunologicals")
    // is a strong topical signal even when the product's own name doesn't
    // mention the word at all.
    if (categoryFields.includes(token)) score += 15
  }
  // Matched the DB-level filter (e.g. via description/dosage) but none of
  // the above — still a real match, just the lowest tier.
  return score > 0 ? score : 5
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
  const country = searchParams.get('country') || ''
  const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined
  const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined
  const companyId = searchParams.get('companyId') ? parseInt(searchParams.get('companyId')!) : undefined
  const partnerId = searchParams.get('partnerId') ? parseInt(searchParams.get('partnerId')!) : undefined
  const noPrice = searchParams.get('noPrice') === 'true'
  const noImage = searchParams.get('noImage') === 'true'
  const noDescription = searchParams.get('noDescription') === 'true'

  // This same endpoint is also used by admin/internal tooling (product
  // management, order lookups, discount setup, extractors) that need to see
  // inactive/pending products, so it can't filter by default. Only the
  // public storefront listing passes publicOnly=true.
  const publicOnly = searchParams.get('publicOnly') === 'true'

  // Build where clause
  const where: any = publicOnly
    ? { isActive: true, approvalStatus: 'APPROVED' }
    : {}

  // Country filter - filter by company's country
  if (country && country !== 'all') {
    where.company = {
      country: country
    }
  }

  // Search filter - searches across multiple fields, including category
  // fields so e.g. searching "vaccine" also surfaces products filed under
  // a "Vaccines & Immunologicals" category even if the product's own name
  // doesn't contain the word (see scoreSearchMatch for how these rank).
  // In MySQL, contains is case-insensitive by default
  if (search) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          { productName: { contains: search } },
          { genericName: { contains: search } },
          { description: { contains: search } },
          { dosage: { contains: search } },
          { category: { contains: search } },
          { subCategory: { contains: search } },
          { subsubCategory: { contains: search } },
          { productType: { contains: search } },
          { categories: { some: { category: { contains: search } } } },
        ],
      },
    ]
  }

  // Category filters — matches either the primary category or one of the
  // product's additional categories (see ProductCategory in the schema).
  // Kept as its own AND-ed OR clause so it composes correctly alongside the
  // search filter above instead of being merged into the same OR (which
  // would turn "search AND category" into "search OR category").
  if (category && category !== 'all') {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      { OR: [{ category }, { categories: { some: { category } } }] },
    ]
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
  if (companyId) {
    where.companyId = companyId
  }
  if (partnerId) {
    where.partnerId = partnerId
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

  // Quality filters
  if (noPrice) {
    where.variants = { none: { customerPrice: { not: null } } }
  }
  if (noImage) {
    where.image = { is: null }
  }
  if (noDescription) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      { OR: [{ description: null }, { description: '' }] },
    ]
  }

  // Build orderBy. 'relevance' (the storefront's default sort — see
  // ProductsClient.tsx) uses the ranking engine's score (src/lib/ranking.ts)
  // instead of plain recency. isFeatured always wins first so admin can
  // still manually pin a product to the top regardless of its score.
  let orderBy: any = {}
  if (sortBy === 'relevance') {
    orderBy = [{ isFeatured: 'desc' }, { rankingScore: 'desc' }, { createdAt: 'desc' }]
  } else if (sortBy === 'createdAt') {
    orderBy = { createdAt: sortOrder }
  } else if (sortBy === 'productName') {
    orderBy = { productName: sortOrder }
  }

  try {
    // Execute queries
    const now = new Date()

    // Relevance-ranked search: a plain ORDER BY can't express "the best
    // text match comes first," so when a search term is active we rank the
    // DB-level matches ourselves (see scoreSearchMatch above) and paginate
    // the ranked list, instead of pagination + sort happening in one SQL
    // query. Skipped for the rare admin-only quality-filter combo (data
    // cleanup tooling, never used alongside a real customer search), and
    // skipped if the caller explicitly asked for a different sort (e.g. a
    // visitor searches, then deliberately picks "Latest" — that choice
    // should win over relevance, not get silently overridden).
    const requestedSortBy = searchParams.get('sortBy')
    const useRelevanceRanking =
      !!search && !noPrice && !noImage && !noDescription && (!requestedSortBy || requestedSortBy === 'relevance')

    const discountInclude = {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    }
    const fullInclude = {
      company: true,
      partner: true,
      image: true,
      pdf: true,
      variants: true,
      discounts: { where: discountInclude },
      categories: true,
    }

    let items: any[]
    let total: number

    if (useRelevanceRanking) {
      const [candidates, candidateTotal] = await Promise.all([
        prisma.product.findMany({
          where,
          select: {
            id: true,
            productName: true,
            genericName: true,
            category: true,
            subCategory: true,
            subsubCategory: true,
            productType: true,
            rankingScore: true,
          },
          orderBy: { rankingScore: 'desc' }, // keeps the most-popular subset if we hit the cap below
          take: 1000, // safety cap against a pathologically broad search term
        }),
        prisma.product.count({ where }),
      ])

      const ranked = candidates
        .map((c) => ({ id: c.id, score: scoreSearchMatch(c, search), rankingScore: c.rankingScore }))
        .sort((a, b) => b.score - a.score || b.rankingScore - a.rankingScore)

      const pageIds = ranked.slice(skip, skip + limit).map((r) => r.id)
      const orderIndex = new Map(pageIds.map((id, i) => [id, i]))

      const pageItems = pageIds.length
        ? await prisma.product.findMany({ where: { id: { in: pageIds } }, include: fullInclude })
        : []

      // findMany with `id: { in }` doesn't preserve input order — restore
      // the relevance ranking we just computed.
      items = pageItems.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0))
      total = candidateTotal
    } else {
      ;[items, total] = await Promise.all([
        prisma.product.findMany({ where, orderBy, skip, take: limit, include: fullInclude }),
        prisma.product.count({ where }),
      ])
    }

    // Fetch company-level discounts for all companies in the results
    const companyIds = [...new Set(items.map(p => p.companyId).filter(Boolean))]
    const companyDiscounts = companyIds.length > 0 ? await prisma.discount.findMany({
      where: {
        companyId: { in: companyIds },
        productId: null,
        variantId: null,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      }
    }) : []

    // Merge company-level discounts into each product's discounts array
    const itemsWithCompanyDiscounts = items.map(product => ({
      ...product,
      discounts: [
        ...product.discounts,
        ...companyDiscounts.filter(d => d.companyId === product.companyId)
      ]
    }))

    // Get min and max prices for the price range slider. This is the same
    // catalog-wide query regardless of the current filters, so it was
    // running on every single request — cache it instead of hitting the DB
    // every time for a number that barely moves minute to minute.
    const priceStats = await cached('product:price-stats', 600, () =>
      prisma.productVariant.aggregate({
        _min: { customerPrice: true },
        _max: { customerPrice: true },
        where: {
          product: {
            isActive: true
          }
        }
      })
    )

    return NextResponse.json({
      data: itemsWithCompanyDiscounts,
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
    const imageUrlFieldPut = (formData.get('imageUrl') as string | null)?.trim() || null
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

    

    // Additional categories — only touched when the caller explicitly marks
    // the field as provided (via `additionalCategoriesProvided`). This lets
    // a full edit form send an empty list to clear all extra categories,
    // while older/partial callers that omit the marker leave the product's
    // existing extra categories untouched instead of silently wiping them.
    const hasAdditionalCategories = formData.get('additionalCategoriesProvided') === 'true'
    const effectiveCategory = validation.data.category ?? existingProduct.category
    const additionalCategories = hasAdditionalCategories
      ? [...new Set(
          formData.getAll('additionalCategories')
            .map((v) => v.toString().trim())
            .filter((v) => v && v !== effectiveCategory)
        )]
      : null

    // Update product with transactions
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Update product data
      const updated = await tx.product.update({
        where: { id: productId },
        data: validation.data,
      })

      if (additionalCategories !== null) {
        await tx.productCategory.deleteMany({ where: { productId } })
        if (additionalCategories.length > 0) {
          await tx.productCategory.createMany({
            data: additionalCategories.map((category) => ({ productId, category })),
          })
        }
      }



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
            await deleteFromCloudinary(existingProduct.image.publicId, 'image')

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
      } else if (imageUrlFieldPut) {
        // If a direct URL is provided (no file upload), upsert with that URL
        if (existingProduct.image?.publicId) {
          try {
            await deleteFromCloudinary(existingProduct.image.publicId, 'image')
          } catch (error) {
            console.error('Failed to delete old image:', error)
          }
        }

        await tx.productImage.upsert({
          where: { productId },
          create: {
            url: imageUrlFieldPut,
            alt: cleanedProductData.productName || existingProduct.productName,
            publicId: null,
            productId
          },
          update: {
            url: imageUrlFieldPut,
            alt: cleanedProductData.productName || existingProduct.productName,
            publicId: null
          }
        })
      }

      // Handle PDF update
      if (pdfResult) {
        // Delete old PDF from Cloudinary
        if (existingProduct.pdf?.publicId) {
          try {
            await deleteFromCloudinary(existingProduct.pdf.publicId, 'raw')
            
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
          partner: true,
          categories: true
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