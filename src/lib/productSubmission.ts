import { prisma } from '@/lib/prisma'
import { uploadImage, uploadPDF } from '@/lib/cloudinary'
import { z } from 'zod'

// Shared by the company- and partner-facing "submit a product" routes.
// Mirrors the admin product form's parsing (see /api/product POST), but
// always creates the product PENDING and inactive — it only goes live once
// an admin approves it from /dashboard/product-approvals.

interface VariantInput {
  packingVolume: string
  companyPrice?: number
  dealerPrice?: number
  customerPrice: number
  inventory: number
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const submissionSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  genericName: z.string().optional(),
  productLink: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  subCategory: z.string().min(1, 'Sub-category is required'),
  subsubCategory: z.string().min(1, 'Sub-sub-category is required'),
  productType: z.string().min(1, 'Product type is required'),
  companyId: z.number().min(1, 'Company is required'),
  partnerId: z.number().min(1, 'Partner is required'),
  description: z.string().optional(),
  dosage: z.string().optional(),
  outofstock: z.boolean().optional(),
})

async function handleFileUpload(file: File | null, type: 'image' | 'pdf') {
  if (!file || file.size === 0) return null

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`)
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return type === 'image'
    ? uploadImage(buffer, 'products/images', file.name)
    : uploadPDF(buffer, 'products/pdfs', file.name)
}

export async function createPendingProductSubmission(
  formData: FormData,
  submittedByRole: 'COMPANY' | 'PARTNER'
) {
  const productData = {
    productName: formData.get('productName') as string,
    genericName: (formData.get('genericName') as string) || undefined,
    productLink: (formData.get('productLink') as string) || undefined,
    category: formData.get('category') as string,
    subCategory: formData.get('subCategory') as string,
    subsubCategory: formData.get('subsubCategory') as string,
    productType: formData.get('productType') as string,
    companyId: Number(formData.get('companyId')),
    partnerId: Number(formData.get('partnerId')),
    description: (formData.get('description') as string) || undefined,
    dosage: (formData.get('dosage') as string) || undefined,
    outofstock: formData.get('outofstock') === 'true',
  }

  const validation = submissionSchema.safeParse(productData)
  if (!validation.success) {
    throw new Error(validation.error.errors[0].message)
  }

  const imageUrlField = (formData.get('imageUrl') as string | null)?.trim() || null
  const imageAltField = (formData.get('imageAlt') as string | null)?.trim() || null
  const [imageResult, pdfResult] = await Promise.all([
    handleFileUpload(formData.get('image') as File | null, 'image'),
    handleFileUpload(formData.get('pdf') as File | null, 'pdf'),
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
      inventory: Number(formData.get(`variants[${i}][inventory]`)) || 0,
    })
  }

  // Additional categories the product also shows up under, on top of the
  // required primary `category` above — same mechanism as the admin form
  // (see ProductCategory in the schema).
  const additionalCategories = [...new Set(
    formData.getAll('additionalCategories')
      .map((v) => v.toString().trim())
      .filter((v) => v && v !== validation.data.category)
  )]

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        ...validation.data,
        isActive: false,
        isFeatured: false,
        approvalStatus: 'PENDING',
        submittedByRole,
      },
    })

    for (const variant of variants) {
      await tx.productVariant.create({ data: { ...variant, productId: product.id } })
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
          productId: product.id,
        },
      })
    } else if (imageUrlField) {
      await tx.productImage.create({
        data: {
          url: imageUrlField,
          alt: imageAltField || validation.data.productName,
          publicId: null,
          productId: product.id,
        },
      })
    }

    if (pdfResult) {
      await tx.productPdf.create({
        data: { url: pdfResult.secure_url, publicId: pdfResult.public_id, productId: product.id },
      })
    }

    return tx.product.findUnique({
      where: { id: product.id },
      include: { image: true, pdf: true, variants: true, categories: true },
    })
  })
}
