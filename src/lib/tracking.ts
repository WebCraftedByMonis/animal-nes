import { prisma } from '@/lib/prisma'
import type { TrackingEventType, Prisma } from '@prisma/client'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Central event tracking service. Every event-producing code path (API
 * routes, server components, client components via /api/track) writes
 * through this one function — controllers should never keep their own ad
 * hoc counters. Backs the /dashboard/analytics view and the affiliate
 * click/conversion attribution flow.
 */

export const VISITOR_COOKIE = 'aw_sid'

export interface TrackEventInput {
  type: TrackingEventType
  sessionId?: string | null
  userId?: string | null
  productId?: number | null
  affiliateLinkId?: number | null
  affiliateClickId?: number | null
  checkoutId?: number | null
  searchQuery?: string | null
  path?: string | null
  referrer?: string | null
  metadata?: Record<string, unknown> | null
}

export async function trackEvent(input: TrackEventInput): Promise<void> {
  try {
    await prisma.trackingEvent.create({
      data: {
        type: input.type,
        sessionId: input.sessionId ?? null,
        userId: input.userId ?? null,
        productId: input.productId ?? null,
        affiliateLinkId: input.affiliateLinkId ?? null,
        affiliateClickId: input.affiliateClickId ?? null,
        checkoutId: input.checkoutId ?? null,
        searchQuery: input.searchQuery ?? null,
        path: input.path ?? null,
        referrer: input.referrer ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    })
  } catch (error) {
    // Tracking must never break the caller's request.
    console.error('[tracking] Failed to record event:', input.type, error)
  }
}

// Route handlers (have a NextRequest with cookies already attached).
export function getSessionIdFromRequest(req: NextRequest): string | null {
  return req.cookies.get(VISITOR_COOKIE)?.value || null
}

// Server components (App Router `cookies()` is async in Next 15). The
// visitor cookie itself is set by middleware.ts on every request, so pages
// only ever need to read it here.
export async function getSessionIdFromCookies(): Promise<string | null> {
  try {
    const store = await cookies()
    return store.get(VISITOR_COOKIE)?.value || null
  } catch {
    return null
  }
}
