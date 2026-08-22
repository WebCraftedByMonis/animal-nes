import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - list products for the approval queue, filterable by status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'PENDING';

    const where = status === 'all' ? {} : { approvalStatus: status as 'PENDING' | 'APPROVED' | 'REJECTED' };

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        productName: true,
        genericName: true,
        category: true,
        subCategory: true,
        categories: { select: { category: true } },
        description: true,
        approvalStatus: true,
        rejectionReason: true,
        submittedByRole: true,
        createdAt: true,
        image: { select: { url: true } },
        company: { select: { id: true, companyName: true } },
        partner: { select: { id: true, partnerName: true, shopName: true } },
        variants: { select: { id: true, packingVolume: true, customerPrice: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Get product approvals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - approve or reject a pending product submission
export async function PUT(request: NextRequest) {
  try {
    const { productId, action, rejectionReason } = await request.json();

    if (!productId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'productId and a valid action are required' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        approvalStatus: action === 'approve' ? 'APPROVED' : 'REJECTED',
        isActive: action === 'approve' ? true : false,
        rejectionReason: action === 'reject' ? (rejectionReason || null) : null,
      },
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error) {
    console.error('Product approval action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
