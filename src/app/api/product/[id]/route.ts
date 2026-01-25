// app/api/product/[id]/route.ts
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Add Promise wrapper
) {
  try {
    // Await the params object first
    const { id: idString } = await params;
    console.log('API Route called with ID:', idString) // Debug log
    
    const productId = parseInt(idString, 10);

    if (isNaN(productId)) {
      console.log('Invalid ID provided:', idString) // Debug log
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    console.log('Searching for product with ID:', productId) // Debug log

    const now = new Date()
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        image: true,
        pdf: true,
        company: true,
        partner: true,
        variants: true,
        discounts: {
          where: {
            isActive: true,
            startDate: { lte: now },
            endDate: { gte: now }
          }
        }
      },
    });

    console.log('Database query result:', product ? 'Product found' : 'Product not found') // Debug log

    if (!product) {
      console.log('Product not found in database for ID:', productId) // Debug log
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Fetch company-level discounts if product has a company
    let productWithCompanyDiscounts = product
    if (product.companyId) {
      const companyDiscounts = await prisma.discount.findMany({
        where: {
          companyId: product.companyId,
          productId: null,
          variantId: null,
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now }
        }
      })

      // Merge company-level discounts with product discounts
      productWithCompanyDiscounts = {
        ...product,
        discounts: [...product.discounts, ...companyDiscounts]
      }
    }

    console.log('Returning product data successfully') // Debug log
    return NextResponse.json({ data: productWithCompanyDiscounts });

  } catch (error) {
    console.error('[PRODUCT_DETAIL_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}