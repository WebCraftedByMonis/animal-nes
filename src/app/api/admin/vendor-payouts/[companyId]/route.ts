import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - full ledger history for one vendor (company), most recent first
export async function GET(request: Request, { params }: { params: Promise<{ companyId: string }> }) {
  try {
    const { companyId: companyIdParam } = await params;
    const companyId = Number(companyIdParam);
    if (!companyId || Number.isNaN(companyId)) {
      return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 });
    }

    const [company, entries] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, companyName: true, email: true, mobileNumber: true },
      }),
      prisma.vendorLedgerEntry.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        include: {
          checkoutItem: {
            select: {
              id: true,
              checkoutId: true,
              quantity: true,
              product: { select: { productName: true } },
            },
          },
        },
      }),
    ]);

    if (!company) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const balance = entries.reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({ company, balance, entries });
  } catch (error) {
    console.error('Error fetching vendor ledger:', error);
    return NextResponse.json({ error: 'Failed to fetch vendor ledger' }, { status: 500 });
  }
}
