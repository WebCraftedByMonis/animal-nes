import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const country = searchParams.get('country') || '';

    const companies = await prisma.company.findMany({
      where: {
        companyName: { 
          contains: search,
          
        },
        ...(country && country !== 'all' ? { country } : {}),
      },
      select: {
        id: true,
        companyName: true,
      },
      orderBy: {
        companyName: 'asc',
      },
      take: limit,
    });

    return NextResponse.json({
      data: companies,
      total: companies.length,
    });
  } catch (error) {
    console.error('Error searching companies:', error);
    return NextResponse.json(
      { error: 'Failed to search companies' },
      { status: 500 }
    );
  }
}
