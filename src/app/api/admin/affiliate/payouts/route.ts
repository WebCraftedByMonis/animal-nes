import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAffiliatePayout, getAffiliateBalance } from '@/lib/affiliateLedger';

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get('status') || 'all';

    const payouts = await prisma.affiliatePayout.findMany({
      where: status !== 'all' ? { status } : undefined,
      include: { affiliatePartner: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ payouts });
  } catch (error) {
    console.error('List affiliate payouts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, action, notes } = await request.json();

    if (!id || !action) return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const payout = await prisma.affiliatePayout.findUnique({ where: { id: Number(id) } });
    if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    if (payout.status !== 'pending') {
      return NextResponse.json({ error: 'This request has already been processed' }, { status: 400 });
    }

    if (action === 'approve') {
      const balance = await getAffiliateBalance(payout.affiliatePartnerId);
      if (payout.amount > balance) {
        return NextResponse.json({ error: 'Payout amount exceeds the affiliate’s current balance' }, { status: 400 });
      }
      await recordAffiliatePayout({
        affiliatePartnerId: payout.affiliatePartnerId,
        amount: payout.amount,
        notes: `Payout request #${payout.id}`,
      });
    }

    const updated = await prisma.affiliatePayout.update({
      where: { id: payout.id },
      data: { status: action === 'approve' ? 'approved' : 'rejected', notes: notes || null },
    });

    return NextResponse.json({ payout: updated });
  } catch (error) {
    console.error('Update affiliate payout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
