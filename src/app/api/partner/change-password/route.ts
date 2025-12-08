import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validatePartnerSession, verifyPassword, hashPassword } from '@/lib/auth/partner-auth';

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('partner-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const partner = await validatePartnerSession(token);

    if (!partner) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Verify current password
    if (partner.password) {
      const isValid = await verifyPassword(currentPassword, partner.password);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 401 }
        );
      }
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.partner.update({
      where: { id: partner.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
