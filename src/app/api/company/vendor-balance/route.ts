import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { validateCompanySession } from '@/lib/auth/company-auth';
import { getCompanyBalance } from '@/lib/vendorLedger';

async function getCompanyFromSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('company-token')?.value;
  if (!token) return null;
  try {
    const company = await validateCompanySession(token);
    return company?.id || null;
  } catch {
    return null;
  }
}

// GET - a company's derived payout balance + recent ledger history
export async function GET() {
  try {
    const companyId = await getCompanyFromSession();
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [balance, recentEntries] = await Promise.all([
      getCompanyBalance(companyId),
      prisma.vendorLedgerEntry.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          type: true,
          amount: true,
          notes: true,
          createdAt: true,
          checkoutItemId: true,
        },
      }),
    ]);

    return NextResponse.json({ balance, recentEntries });
  } catch (error) {
    console.error('Error fetching vendor balance:', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}
