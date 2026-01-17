import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/partner-auth';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find partner by email
    const partner = await prisma.partner.findUnique({
      where: { partnerEmail: email },
    });

    if (!partner) {
      return NextResponse.json(
        { error: 'No account found with this email address' },
        { status: 404 }
      );
    }

    // Set new password to partner123
    const newPassword = 'partner123';
    const hashedPassword = await hashPassword(newPassword);

    // Update partner password
    await prisma.partner.update({
      where: { id: partner.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Password has been reset',
        newPassword: newPassword
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
