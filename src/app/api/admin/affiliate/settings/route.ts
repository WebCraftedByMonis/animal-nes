import { NextRequest, NextResponse } from 'next/server';
import { getAffiliateSettings } from '@/lib/affiliateLedger';
import { prisma } from '@/lib/prisma';

// The only place affiliate commission defaults are decided — nothing is
// hardcoded in source. GET returns (and lazily creates) the singleton row,
// PUT updates it.
export async function GET() {
  try {
    const settings = await getAffiliateSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Get affiliate settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { defaultCommissionType, defaultCommissionValue, cookieWindowDays, minPayoutAmount } = body;

    if (defaultCommissionType && !['PERCENTAGE', 'FIXED'].includes(defaultCommissionType)) {
      return NextResponse.json({ error: 'Invalid commission type' }, { status: 400 });
    }

    const settings = await prisma.affiliateSettings.upsert({
      where: { id: 1 },
      update: {
        ...(defaultCommissionType && { defaultCommissionType }),
        ...(defaultCommissionValue != null && { defaultCommissionValue: Number(defaultCommissionValue) }),
        ...(cookieWindowDays != null && { cookieWindowDays: Number(cookieWindowDays) }),
        ...(minPayoutAmount != null && { minPayoutAmount: Number(minPayoutAmount) }),
      },
      create: {
        id: 1,
        defaultCommissionType: defaultCommissionType || 'PERCENTAGE',
        defaultCommissionValue: defaultCommissionValue != null ? Number(defaultCommissionValue) : 5,
        cookieWindowDays: cookieWindowDays != null ? Number(cookieWindowDays) : 30,
        minPayoutAmount: minPayoutAmount != null ? Number(minPayoutAmount) : 0,
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Update affiliate settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
