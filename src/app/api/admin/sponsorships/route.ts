import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAutoTransaction } from '@/lib/autoTransaction';

// GET - list sponsorship requests for the approval queue, filterable by status
export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get('status') || 'PENDING_PAYMENT';
    const where = status === 'all' ? {} : { status: status as any };

    const sponsorships = await prisma.productSponsorship.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, productName: true, image: { select: { url: true } } } },
        company: { select: { id: true, companyName: true } },
        partner: { select: { id: true, partnerName: true, shopName: true } },
      },
    });

    return NextResponse.json({ sponsorships });
  } catch (error) {
    console.error('Get sponsorships error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - approve or reject a sponsorship request. Approving starts the boost
// immediately (startDate = now) and logs the payment into the Finance
// dashboard as OTHER_INCOME — same ledger your other revenue already flows
// through.
export async function PUT(request: NextRequest) {
  try {
    const { sponsorshipId, action, rejectionReason } = await request.json();

    if (!sponsorshipId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'sponsorshipId and a valid action are required' }, { status: 400 });
    }

    const sponsorship = await prisma.productSponsorship.findUnique({
      where: { id: sponsorshipId },
      include: { product: { select: { productName: true } } },
    });
    if (!sponsorship) {
      return NextResponse.json({ error: 'Sponsorship request not found' }, { status: 404 });
    }

    if (action === 'approve') {
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + sponsorship.durationDays);

      const updated = await prisma.productSponsorship.update({
        where: { id: sponsorshipId },
        data: { status: 'ACTIVE', startDate, endDate, rejectionReason: null },
      });

      await createAutoTransaction({
        type: 'OTHER_INCOME',
        amount: sponsorship.amount,
        description: `Product sponsorship — ${sponsorship.product.productName} (${sponsorship.durationDays} days)`,
        paymentMethod: sponsorship.paymentMethod || undefined,
        status: 'COMPLETED',
      });

      return NextResponse.json({ success: true, sponsorship: updated });
    }

    const updated = await prisma.productSponsorship.update({
      where: { id: sponsorshipId },
      data: { status: 'REJECTED', rejectionReason: rejectionReason || null },
    });

    return NextResponse.json({ success: true, sponsorship: updated });
  } catch (error) {
    console.error('Sponsorship action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
