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

    const partner = await prisma.partner.findUnique({
      where: { id },
      include: {
        partnerImage: true,
        _count: { select: { products: true } },
        products: {
          include: {
            image: true,
            variants: true,
            company: true,
          },
          ...(paginate ? { skip: (page - 1) * limit, take: limit } : {}),
        },
        availableDaysOfWeek: true,
        startTime: true,
      },
    });

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    const { _count, ...rest } = partner;
    return NextResponse.json({ ...rest, totalProducts: _count.products });
  } catch (error) {
    console.error('Error fetching partner:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partner' },
      { status: 500 }
    );
  }
}
