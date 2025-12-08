import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('partner-token')?.value;

    if (token) {
      // Delete the session from database
      await prisma.partnerSession.deleteMany({
        where: { token },
      });
    }

    // Clear the cookie
    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );

    response.cookies.delete('partner-token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
