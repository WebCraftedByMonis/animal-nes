import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAffiliateBalance } from '@/lib/affiliateLedger';

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get('status') || 'all';

    const partners = await prisma.affiliatePartner.findMany({
      where: status !== 'all' ? { status: status.toUpperCase() as 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' } : undefined,
      include: { _count: { select: { links: true, clicks: true, conversions: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const withBalance = await Promise.all(
      partners.map(async (p) => ({
        ...p,
        balance: await getAffiliateBalance(p.id),
      }))
    );

    return NextResponse.json({ partners: withBalance });
  } catch (error) {
    console.error('List affiliate partners error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Approve/reject/suspend an affiliate, or set their per-affiliate commission override.
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, rejectionReason, commissionType, commissionValue } = body;

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const data: Record<string, unknown> = {};

    if (action) {
      if (!['approve', 'reject', 'suspend'].includes(action)) {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }
      data.status = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'SUSPENDED';
      if (action === 'reject') data.rejectionReason = rejectionReason || null;
    }

    if (commissionType !== undefined) data.commissionType = commissionType || null;
    if (commissionValue !== undefined) data.commissionValue = commissionValue === '' || commissionValue == null ? null : Number(commissionValue);

    const partner = await prisma.affiliatePartner.update({ where: { id: Number(id) }, data });

    return NextResponse.json({ partner });
  } catch (error) {
    console.error('Update affiliate partner error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
