import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createPartnerSession } from '@/lib/auth/partner-auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find partner by email
    const partner = await prisma.partner.findUnique({
      where: { partnerEmail: email },
    });

    if (!partner) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if partner has a password set
    if (!partner.password) {
      return NextResponse.json(
        { error: 'No password set for this account. Please contact admin.' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, partner.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Vendor accounts created through the public registration form need
    // admin approval before they can sign in
    if (partner.approvalStatus === 'PENDING') {
      return NextResponse.json(
        { error: 'Your vendor account is still under review. We’ll email you as soon as it’s approved.' },
        { status: 403 }
      );
    }
    if (partner.approvalStatus === 'REJECTED') {
      return NextResponse.json(
        { error: partner.rejectionReason || 'Your vendor application was not approved. Please contact support.' },
        { status: 403 }
      );
    }

    // Create session
    const token = await createPartnerSession(partner.id);

    // Set cookie
    const response = NextResponse.json(
      { success: true, message: 'Login successful' },
      { status: 200 }
    );

    // Check if we're on localhost to allow non-secure cookies in production build for testing
    const isLocalhost = request.headers.get('host')?.includes('localhost') ||
                       request.headers.get('host')?.includes('127.0.0.1');

    response.cookies.set('partner-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && !isLocalhost,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
