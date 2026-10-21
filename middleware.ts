// middleware.ts - This file should be in your project ROOT directory
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Legacy product URLs: before commit bc1d718 (Aug 5 2026), product pages
// lived at /products/{id}. That route was deleted with NO redirect left
// behind (Next.js won't allow it to coexist with the new
// /products/[categorySlug]/[productSlug] route as a sibling dynamic
// segment), so every one of those old, previously-indexed/linked URLs has
// been hard 404ing ever since. Rewritten in-process to a route handler that
// does the DB lookup and issues the 301 — an earlier version fetch()ed the
// site's own public URL from here, which silently failed on the VPS.
const LEGACY_PRODUCT_ID = /^\/products\/(\d+)$/;

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

// Anonymous visitor id for the central event-tracking service
// (src/lib/tracking.ts). Set once here so every request — server components
// included, which can't set cookies themselves during render — has one to
// read.
const VISITOR_COOKIE = 'aw_sid';

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  if (host.startsWith('www.')) {
    const url = request.nextUrl.clone()
    url.host = host.replace(/^www\./, '')
    return NextResponse.redirect(url, { status: 301 })
  }

  const { pathname } = request.nextUrl;

  const legacyMatch = pathname.match(LEGACY_PRODUCT_ID);
  if (legacyMatch) {
    return NextResponse.rewrite(new URL(`/api/legacy-product/${legacyMatch[1]}`, request.url));
  }

  let response: NextResponse | null = null;
  let visitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    response = NextResponse.next();
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
      sameSite: 'lax',
    });
  }

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
      return response ?? NextResponse.next();
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
    return response ?? NextResponse.next();
  }

  return response ?? NextResponse.next();
}

export const config = {
  matcher: [
    // Also skip the sitemap/robots/feed routes — they're crawler-hit-heavy,
    // already set their own cache headers, and gain nothing from the
    // visitor-id cookie or the dashboard-auth check.
    '/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|sitemap/|robots\\.txt|products-feed\\.xml).*)',
  ],
};