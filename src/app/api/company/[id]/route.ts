import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const url = new URL(request.url);
    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');
    const page = parseInt(pageParam || '0');
    const limit = parseInt(limitParam || '0');
    const paginate = page > 0 && limit > 0;

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        image: true,
        _count: { select: { products: true } },
        products: {
          include: {
            image: true,
            variants: true,
            partner: true,
          },
          ...(paginate ? { skip: (page - 1) * limit, take: limit } : {}),
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const { _count, ...rest } = company;
    return NextResponse.json({ ...rest, totalProducts: _count.products });
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company' },
      { status: 500 }
    );
  }
}