import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAffiliateAdjustment } from '@/lib/affiliateLedger';

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get('status') || 'all';

    const conversions = await prisma.affiliateConversion.findMany({
      where: status !== 'all' ? { status: status.toUpperCase() as 'APPROVED' | 'REVERSED' } : undefined,
      include: {
        affiliatePartner: { select: { id: true, name: true, email: true } },
        commission: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ conversions });
  } catch (error) {
    console.error('List affiliate conversions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Reverse a conversion (e.g. the order was refunded/cancelled) — flips its
// status and writes a negative ADJUSTMENT ledger row that cancels out the
// EARNED commission it produced. History stays intact for reconciliation.
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, reversalReason } = body;

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const conversion = await prisma.affiliateConversion.findUnique({
      where: { id: Number(id) },
      include: { commission: true },
    });

    if (!conversion) return NextResponse.json({ error: 'Conversion not found' }, { status: 404 });
    if (conversion.status === 'REVERSED') {
      return NextResponse.json({ error: 'Conversion is already reversed' }, { status: 400 });
    }

    await prisma.affiliateConversion.update({
      where: { id: conversion.id },
      data: { status: 'REVERSED', reversalReason: reversalReason || null },
    });

    if (conversion.commission && conversion.commission.amount > 0) {
      await recordAffiliateAdjustment({
        affiliatePartnerId: conversion.affiliatePartnerId,
        amount: -conversion.commission.amount,
        notes: `Reversal of conversion #${conversion.id}${reversalReason ? `: ${reversalReason}` : ''}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reverse affiliate conversion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
