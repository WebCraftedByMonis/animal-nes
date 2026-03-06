import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { validatePartnerSession } from '@/lib/auth/partner-auth';

async function getPartnerFromSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('partner-token')?.value;

  if (!token) {
    return null;
  }

  try {
    const partner = await validatePartnerSession(token);
    return partner?.id || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const partnerId = await getPartnerFromSession();
    if (!partnerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const [products, totalProducts] = await Promise.all([
      prisma.product.findMany({
        where: { partnerId },
        include: { image: true, variants: true, company: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { productName: 'asc' },
      }),
      prisma.product.count({ where: { partnerId } }),
    ]);

    return NextResponse.json({
      products,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
    });
  } catch (error) {
    console.error('Error fetching partner products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
