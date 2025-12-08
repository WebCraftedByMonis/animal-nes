import { NextRequest, NextResponse } from 'next/server';
import { validatePartnerSession } from '@/lib/auth/partner-auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('partner-token')?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const partner = await validatePartnerSession(token);

    if (!partner) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // Fetch additional data with relations
    const { prisma } = await import('@/lib/prisma');
    const partnerWithRelations = await prisma.partner.findUnique({
      where: { id: partner.id },
      include: {
        products: {
          include: {
            image: true,
            variants: true,
            company: true,
          },
        },
      },
    });

    return NextResponse.json({
      authenticated: true,
      partner: {
        id: partner.id,
        partnerName: partner.partnerName,
        partnerEmail: partner.partnerEmail,
        shopName: partner.shopName,
        partnerMobileNumber: partner.partnerMobileNumber,
        cityName: partner.cityName,
        fullAddress: partner.fullAddress,
        gender: partner.gender,
        state: partner.state,
        zipcode: partner.zipcode,
        areaTown: partner.areaTown,
        qualificationDegree: partner.qualificationDegree,
        specialization: partner.specialization,
        species: partner.species,
        partnerType: partner.partnerType,
        isPremium: partner.isPremium || false,
        referralCode: partner.referralCode || null,
        walletBalance: partner.walletBalance || 0,
        products: partnerWithRelations?.products || [],
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
