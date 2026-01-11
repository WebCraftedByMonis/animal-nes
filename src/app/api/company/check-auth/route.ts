import { NextRequest, NextResponse } from 'next/server';
import { validateCompanySession } from '@/lib/auth/company-auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('company-token')?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const company = await validateCompanySession(token);

    if (!company) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // Fetch additional data with relations
    const { prisma } = await import('@/lib/prisma');
    const companyWithRelations = await prisma.company.findUnique({
      where: { id: company.id },
      include: {
        image: true,
        products: {
          include: {
            image: true,
            variants: true,
          },
        },
      },
    });

    return NextResponse.json({
      authenticated: true,
      company: {
        id: company.id,
        companyName: company.companyName,
        email: company.email,
        mobileNumber: company.mobileNumber,
        address: company.address,
        image: companyWithRelations?.image || null,
        products: companyWithRelations?.products || [],
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}
