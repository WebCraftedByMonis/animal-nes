// middleware.ts - This file should be in your project ROOT directory
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Use a constant secret key since you don't want to modify .env
const ADMIN_SECRET = 'your-super-secret-admin-key-change-this-in-production-2024';

// Simple JWT verification without importing external libraries
function verifyToken(token: string): boolean {
  try {
    // For middleware, we'll do a simple check
    // The actual validation will happen in the API routes
    const parts = token.split('.');
    return parts.length === 3; // Basic JWT format check
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