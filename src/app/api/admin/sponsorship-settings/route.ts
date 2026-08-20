import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - current sponsorship pricing/payment config (creates the default row on first read)
export async function GET() {
  try {
    const settings = await prisma.sponsorshipSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching sponsorship settings:', error);
    return NextResponse.json({ error: 'Failed to fetch sponsorship settings' }, { status: 500 });
  }
}

// PUT - update pricing, duration limits, ranking boost strength, and the
// payment details shown to vendors submitting a sponsorship request.
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      pricePerDay,
      pricePerDayAED,
      minDays,
      maxDays,
      rankingBoostMultiplier,
      paymentInstructions,
      jazzcashNumber,
      easypaisaNumber,
      bankName,
      accountTitle,
      accountNumber,
    } = body;

    const settings = await prisma.sponsorshipSettings.upsert({
      where: { id: 1 },
      update: {
        pricePerDay,
        pricePerDayAED,
        minDays,
        maxDays,
        rankingBoostMultiplier,
        paymentInstructions,
        jazzcashNumber,
        easypaisaNumber,
        bankName,
        accountTitle,
        accountNumber,
      },
      create: { id: 1, ...body },
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating sponsorship settings:', error);
    return NextResponse.json({ error: 'Failed to update sponsorship settings' }, { status: 500 });
  }
}
