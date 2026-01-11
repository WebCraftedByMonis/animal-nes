import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createCompanySession } from '@/lib/auth/company-auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find company by email
    const company = await prisma.company.findUnique({
      where: { email: email },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if company has a password set
    if (!company.password) {
      return NextResponse.json(
        { error: 'No password set for this account. Please contact admin.' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, company.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create session
    const token = await createCompanySession(company.id);

    // Set cookie
    const response = NextResponse.json(
      { success: true, message: 'Login successful' },
      { status: 200 }
    );

    // Check if we're on localhost to allow non-secure cookies in production build for testing
    const isLocalhost = request.headers.get('host')?.includes('localhost') ||
                       request.headers.get('host')?.includes('127.0.0.1');

    response.cookies.set('company-token', token, {
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
