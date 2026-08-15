import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAffiliateSession } from '@/lib/auth/affiliate-auth';

async function requireAffiliate(request: NextRequest) {
  const token = request.cookies.get('affiliate-token')?.value;
  if (!token) return null;
  return validateAffiliateSession(token);
}

// Lets an approved (or pending) affiliate fill in / update their own payout
// details — needed before they can request a payout, since those fields are
// optional at signup.
export async function PUT(request: NextRequest) {
  const affiliate = await requireAffiliate(request);
  if (!affiliate) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { phone, paymentMethod, bankName, accountTitle, accountNumber } = body;

  const updated = await prisma.affiliatePartner.update({
    where: { id: affiliate.id },
    data: {
      ...(phone !== undefined && { phone: phone || null }),
      ...(paymentMethod !== undefined && { paymentMethod: paymentMethod || null }),
      ...(bankName !== undefined && { bankName: bankName || null }),
      ...(accountTitle !== undefined && { accountTitle: accountTitle || null }),
      ...(accountNumber !== undefined && { accountNumber: accountNumber || null }),
    },
    select: {
      id: true, name: true, email: true, phone: true, paymentMethod: true,
      bankName: true, accountTitle: true, accountNumber: true,
    },
  });

  return NextResponse.json({ affiliate: updated });
}
