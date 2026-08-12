// app/api/admin/partner-approvals/route.ts
// Review queue for vendor accounts created through the public
// /partner/register sign-up form (POST /api/partner/register), which always
// creates them with approvalStatus = PENDING.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - list partners for the approvals queue, filterable by status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'PENDING';

    const where = status === 'all' ? {} : { approvalStatus: status as 'PENDING' | 'APPROVED' | 'REJECTED' };

    const partners = await prisma.partner.findMany({
      where,
      select: {
        id: true,
        partnerName: true,
        partnerEmail: true,
        partnerMobileNumber: true,
        shopName: true,
        cityName: true,
        state: true,
        country: true,
        partnerType: true,
        specialization: true,
        approvalStatus: true,
        rejectionReason: true,
        createdAt: true,
        partnerImage: { select: { url: true } },
        referredBy: { select: { id: true, partnerName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ partners });
  } catch (error) {
    console.error('Get partner approvals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - approve or reject a pending vendor account
export async function PUT(request: NextRequest) {
  try {
    const { partnerId, action, rejectionReason } = await request.json();

    if (!partnerId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'partnerId and a valid action are required' }, { status: 400 });
    }

    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    const updated = await prisma.partner.update({
      where: { id: partnerId },
      data: {
        approvalStatus: action === 'approve' ? 'APPROVED' : 'REJECTED',
        rejectionReason: action === 'reject' ? (rejectionReason || null) : null,
      },
    });

    return NextResponse.json({ success: true, partner: updated });
  } catch (error) {
    console.error('Partner approval action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
