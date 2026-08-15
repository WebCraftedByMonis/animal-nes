import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createAffiliateSession } from '@/lib/auth/affiliate-auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const affiliate = await prisma.affiliatePartner.findUnique({ where: { email } });

    if (!affiliate) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, affiliate.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (affiliate.status === 'PENDING') {
      return NextResponse.json(
        { error: 'Your affiliate account is still under review. We’ll email you as soon as it’s approved.' },
        { status: 403 }
      );
    }
    if (affiliate.status === 'REJECTED') {
      return NextResponse.json(
        { error: affiliate.rejectionReason || 'Your affiliate application was not approved. Please contact support.' },
        { status: 403 }
      );
    }
    if (affiliate.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Your affiliate account has been suspended. Please contact support.' },
        { status: 403 }
      );
    }

    const token = await createAffiliateSession(affiliate.id);

    const response = NextResponse.json({ success: true, message: 'Login successful' }, { status: 200 });

    const isLocalhost = request.headers.get('host')?.includes('localhost') ||
      request.headers.get('host')?.includes('127.0.0.1');

    response.cookies.set('affiliate-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && !isLocalhost,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Affiliate login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
