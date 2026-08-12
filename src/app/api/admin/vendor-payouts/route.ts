import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordVendorPayout } from '@/lib/vendorLedger';

// GET - every company with ledger activity, and its current derived balance
// (owed to them, minus what's already been paid out)
export async function GET() {
  try {
    const totals = await prisma.vendorLedgerEntry.groupBy({
      by: ['companyId'],
      _sum: { amount: true },
    });

    const companyIds = totals.map((t) => t.companyId);
    const companies = await prisma.company.findMany({
      where: { id: { in: companyIds } },
      select: { id: true, companyName: true, email: true, mobileNumber: true },
    });
    const companyById = new Map(companies.map((c) => [c.id, c]));

    const lastPayouts = await prisma.vendorLedgerEntry.findMany({
      where: { companyId: { in: companyIds }, type: 'PAYOUT' },
      orderBy: { createdAt: 'desc' },
      distinct: ['companyId'],
      select: { companyId: true, createdAt: true },
    });
    const lastPayoutByCompany = new Map(lastPayouts.map((p) => [p.companyId, p.createdAt]));

    const rows = totals
      .map((t) => ({
        companyId: t.companyId,
        companyName: companyById.get(t.companyId)?.companyName || 'Unknown Vendor',
        email: companyById.get(t.companyId)?.email || null,
        mobileNumber: companyById.get(t.companyId)?.mobileNumber || null,
        balance: t._sum.amount || 0,
        lastPayoutAt: lastPayoutByCompany.get(t.companyId) || null,
      }))
      .sort((a, b) => b.balance - a.balance);

    return NextResponse.json({ vendors: rows });
  } catch (error) {
    console.error('Error fetching vendor payout totals:', error);
    return NextResponse.json({ error: 'Failed to fetch vendor payouts' }, { status: 500 });
  }
}

// POST - record that a company was paid out (creates a PAYOUT ledger row,
// reducing their derived balance). Doesn't touch the underlying SALE rows.
export async function POST(request: NextRequest) {
  try {
    const { companyId, amount, notes } = await request.json();

    if (!companyId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'companyId and a positive amount are required' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const entry = await recordVendorPayout({ companyId, amount, notes });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('Error recording vendor payout:', error);
    return NextResponse.json({ error: 'Failed to record payout' }, { status: 500 });
  }
}
