import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/company-auth';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find company by email
    const company = await prisma.company.findUnique({
      where: { email },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'No account found with this email address' },
        { status: 404 }
      );
    }

    // Reset password to company123
    const newPassword = 'company123';
    const hashedPassword = await hashPassword(newPassword);

    // Update company password
    await prisma.company.update({
      where: { id: company.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Password has been reset',
        newPassword: newPassword,
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
