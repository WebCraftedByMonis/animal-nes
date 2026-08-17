import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - current ranking weights (creates the default row on first read)
export async function GET() {
  try {
    const settings = await prisma.rankingSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching ranking settings:', error);
    return NextResponse.json({ error: 'Failed to fetch ranking settings' }, { status: 500 });
  }
}

// PUT - update the weights/boost config. Doesn't recompute scores itself —
// call POST /api/admin/ranking-settings/recalculate (or wait for the
// nightly cron) to apply the new weights to existing products.
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      relevanceWeight,
      conversionWeight,
      ctrWeight,
      salesVelocityWeight,
      freshnessWeight,
      sellerQualityWeight,
      reviewsWeight,
      explorationWeight,
      newProductBoostEnabled,
      newVendorBoostEnabled,
      boostDurationDays,
      boostMultiplier,
    } = body;

    const settings = await prisma.rankingSettings.upsert({
      where: { id: 1 },
      update: {
        relevanceWeight,
        conversionWeight,
        ctrWeight,
        salesVelocityWeight,
        freshnessWeight,
        sellerQualityWeight,
        reviewsWeight,
        explorationWeight,
        newProductBoostEnabled,
        newVendorBoostEnabled,
        boostDurationDays,
        boostMultiplier,
      },
      create: { id: 1, ...body },
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating ranking settings:', error);
    return NextResponse.json({ error: 'Failed to update ranking settings' }, { status: 500 });
  }
}
