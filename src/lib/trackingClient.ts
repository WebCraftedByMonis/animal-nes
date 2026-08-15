'use client'

// Client-side event types — the affiliate click and purchase are always
// recorded server-side (they need to be trustworthy), so they're excluded
// here on purpose.
export type ClientTrackType =
  | 'PRODUCT_IMPRESSION'
  | 'PRODUCT_VIEW'
  | 'SEARCH'
  | 'CATEGORY_VIEW'
  | 'PRODUCT_CLICK'
  | 'WISHLIST_ADD'
  | 'CART_ADD'
  | 'CHECKOUT_START'
  | 'SHARE'
  | 'REVIEW'
  | 'TIME_ON_PRODUCT'

export interface ClientTrackPayload {
  productId?: number
  searchQuery?: string
  metadata?: Record<string, unknown>
}

// Fire-and-forget — never awaited by UI code, never throws. Uses
// navigator.sendBeacon so it survives page navigation/unload.
export function track(type: ClientTrackType, payload: ClientTrackPayload = {}) {
  try {
    const body = JSON.stringify({
      type,
      ...payload,
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    })

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon('/api/track', blob)
      return
    }

    fetch('/api/track', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Tracking must never break the UI.
  }
}
