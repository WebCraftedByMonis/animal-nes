// Public endpoint client components post to via src/lib/trackingClient.ts.
// Server-side flows (checkout, cart, wishlist, affiliate click redirect,
// product page render) call src/lib/tracking.ts's trackEvent() directly
// in-process instead of looping back through HTTP.
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { trackEvent, getSessionIdFromRequest } from '@/lib/tracking'
import type { TrackingEventType } from '@prisma/client'

// AFFILIATE_CLICK and PURCHASE are only ever written server-side where they
// can be trusted — never accepted from the client.
const ALLOWED_CLIENT_TYPES = new Set<TrackingEventType>([
  'PRODUCT_IMPRESSION',
  'PRODUCT_VIEW',
  'SEARCH',
  'CATEGORY_VIEW',
  'PRODUCT_CLICK',
  'WISHLIST_ADD',
  'CART_ADD',
  'CHECKOUT_START',
  'SHARE',
  'REVIEW',
  'TIME_ON_PRODUCT',
])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const type = body?.type as TrackingEventType | undefined

    if (!type || !ALLOWED_CLIENT_TYPES.has(type)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    const session = await auth().catch(() => null)

    await trackEvent({
      type,
      sessionId: getSessionIdFromRequest(req),
      userId: session?.user?.id ?? null,
      productId: typeof body.productId === 'number' ? body.productId : undefined,
      searchQuery: typeof body.searchQuery === 'string' ? body.searchQuery : undefined,
      path: typeof body.path === 'string' ? body.path : undefined,
      referrer: req.headers.get('referer') || undefined,
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : undefined,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/track] error:', error)
    // Never fail the client over a tracking hiccup.
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
