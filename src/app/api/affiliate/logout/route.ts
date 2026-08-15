import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('affiliate-token')?.value;

    if (token) {
      await prisma.affiliatePartnerSession.deleteMany({ where: { token } });
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' }, { status: 200 });
    response.cookies.delete('affiliate-token');
    return response;
  } catch (error) {
    console.error('Affiliate logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
