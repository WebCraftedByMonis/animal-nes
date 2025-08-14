import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin-token')?.value;

    if (token) {
      // Delete the session from database using the token directly
      await prisma.adminSession.deleteMany({
        where: { token },
      });
    }

    // Create a redirect response instead of JSON
    const response = NextResponse.redirect(new URL('/login', request.url));

    // Clear the cookie
    response.cookies.set('admin-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    // Even on error, redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('admin-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return response;
  }
}

// Also handle GET requests for logout
export async function GET(request: NextRequest) {
  return POST(request);
}