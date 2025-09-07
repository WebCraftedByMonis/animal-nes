import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const partners = await prisma.partner.findMany({
      where: {
        partnerName: { 
          contains: search,
          
        },
      },
      select: {
        id: true,
        partnerName: true,
      },
      orderBy: {
        partnerName: 'asc',
      },
      take: limit,
    });

    return NextResponse.json({
      data: partners,
      total: partners.length,
    });
  } catch (error) {
    console.error('Error searching partners:', error);
    return NextResponse.json(
      { error: 'Failed to search partners' },
      { status: 500 }
    );
  }
}