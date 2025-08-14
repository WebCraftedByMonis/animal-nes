import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/auth/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin-token')?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const admin = await validateAdminSession(token);

    if (!admin) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      admin: {
        id: admin.id,
        username: admin.username,
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}