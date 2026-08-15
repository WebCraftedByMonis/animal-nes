import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAffiliateSession } from '@/lib/auth/affiliate-auth';
import { getAffiliateBalance, getAffiliateSettings } from '@/lib/affiliateLedger';

async function requireAffiliate(request: NextRequest) {
  const token = request.cookies.get('affiliate-token')?.value;
  if (!token) return null;
  return validateAffiliateSession(token);
}

export async function GET(request: NextRequest) {
  const affiliate = await requireAffiliate(request);
  if (!affiliate) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payouts = await prisma.affiliatePayout.findMany({
    where: { affiliatePartnerId: affiliate.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ payouts });
}

export async function POST(request: NextRequest) {
  const affiliate = await requireAffiliate(request);
  if (!affiliate) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (affiliate.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Your affiliate account must be approved first' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const amount = Number(body.amount);
  const accountTitle = typeof body.accountTitle === 'string' ? body.accountTitle : affiliate.accountTitle;
  const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber : affiliate.accountNumber;
  const bankName = typeof body.bankName === 'string' ? body.bankName : affiliate.bankName;
  const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod : affiliate.paymentMethod;

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'A valid amount is required' }, { status: 400 });
  }
  if (!accountTitle || !accountNumber || !bankName || !paymentMethod) {
    return NextResponse.json({ error: 'Payout account details are required' }, { status: 400 });
  }

  const [balance, settings] = await Promise.all([
    getAffiliateBalance(affiliate.id),
    getAffiliateSettings(),
  ]);

  if (amount > balance) {
    return NextResponse.json({ error: `Amount exceeds your available balance (${balance})` }, { status: 400 });
  }
  if (amount < settings.minPayoutAmount) {
    return NextResponse.json({ error: `Minimum payout amount is ${settings.minPayoutAmount}` }, { status: 400 });
  }

  const payout = await prisma.affiliatePayout.create({
    data: {
      affiliatePartnerId: affiliate.id,
      amount,
      accountTitle,
      accountNumber,
      bankName,
      paymentMethod,
      status: 'pending',
    },
  });

  return NextResponse.json({ payout }, { status: 201 });
}
