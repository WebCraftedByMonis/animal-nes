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

    // Create session
    const token = await createPartnerSession(partner.id);

    // Set cookie
    const response = NextResponse.json(
      { success: true, message: 'Login successful' },
      { status: 200 }
    );

    response.cookies.set('partner-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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
