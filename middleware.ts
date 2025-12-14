// middleware.ts - This file should be in your project ROOT directory
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple token format verification
// The session tokens are 32-character hex strings, not JWTs
function verifyToken(token: string): boolean {
  try {
    // Check if token is a valid hex string of expected length (32 characters)
    // The actual validation against the database will happen in the API routes
    return typeof token === 'string' && token.length === 32 && /^[a-f0-9]+$/i.test(token);
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the path starts with /dashboard
  if (pathname.startsWith('/dashboard')) {
    // Allow access to login page without authentication
    if (pathname === '/login') {
      // If user has valid token, redirect to dashboard
      const token = request.cookies.get('admin-token')?.value;
      if (token && verifyToken(token)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      // Otherwise, allow access to login page
      return NextResponse.next();
    }

    // For all other dashboard routes, check authentication
    const token = request.cookies.get('admin-token')?.value;

    // If no token or invalid token format, redirect to login
    if (!token || !verifyToken(token)) {
      const loginUrl = new URL('/login', request.url);
      // Add the attempted URL as a redirect parameter (optional)
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Token exists and has valid format, allow access
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all dashboard routes including:
     * - /dashboard
     * - /dashboard/products
     * - /dashboard/companies
     * - /dashboard/addCompany
     * - etc.
     */
    '/dashboard/:path*',
  ],
};