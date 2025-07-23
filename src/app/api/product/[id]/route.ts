// app/api/product/[id]/route.ts
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('API Route called with ID:', params.id) // Debug log
  
  const productId = parseInt(params.id, 10)

  if (isNaN(productId)) {
    console.log('Invalid ID provided:', params.id) // Debug log
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  try {
    console.log('Searching for product with ID:', productId) // Debug log
    
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        image: true,
        pdf: true,
        company: true,
        partner: true,
        variants: true,
      },
    })

    console.log('Database query result:', product ? 'Product found' : 'Product not found') // Debug log

    if (!product) {
      console.log('Product not found in database for ID:', productId) // Debug log
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    console.log('Returning product data successfully') // Debug log
    return NextResponse.json({ data: product })

  } catch (error) {
    console.error('[PRODUCT_DETAIL_ERROR]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}