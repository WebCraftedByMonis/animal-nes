import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAffiliateSession } from '@/lib/auth/affiliate-auth';
import { getAffiliateBalance } from '@/lib/affiliateLedger';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('affiliate-token')?.value;
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const affiliate = await validateAffiliateSession(token);
    if (!affiliate) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const [balance, clickCount, conversionCount, linkCount] = await Promise.all([
      getAffiliateBalance(affiliate.id),
      prisma.affiliateClick.count({ where: { affiliatePartnerId: affiliate.id } }),
      prisma.affiliateConversion.count({ where: { affiliatePartnerId: affiliate.id, status: 'APPROVED' } }),
      prisma.affiliateLink.count({ where: { affiliatePartnerId: affiliate.id } }),
    ]);

    return NextResponse.json({
      authenticated: true,
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone,
        referralCode: affiliate.referralCode,
        status: affiliate.status,
        paymentMethod: affiliate.paymentMethod,
        bankName: affiliate.bankName,
        accountTitle: affiliate.accountTitle,
        accountNumber: affiliate.accountNumber,
      },
      stats: {
        balance,
        clickCount,
        conversionCount,
        linkCount,
      },
    });
  } catch (error) {
    console.error('Affiliate auth check error:', error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
