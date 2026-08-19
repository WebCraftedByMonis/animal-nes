// Shared cookie-consent contract for the personalized-recommendations
// feature (CookieConsentBanner.tsx is the UI). One cookie, read the same
// way on the client and the server so a single Accept/Decline choice
// controls every personalized surface:
//   - because-you-viewed recommendation rail (homepage)
//   - "Recommended For You" + personalized category order on /products
//     (src/app/api/product/portions/route.ts)
//
// Deliberately scoped to personalization only — it does NOT gate the
// existing anonymous PRODUCT_VIEW/IMPRESSION/CLICK tracking in
// trackingClient.ts, which feeds the site-wide ranking engine
// (src/lib/ranking.ts) used for every visitor's search/browse ordering,
// not just the opted-in visitor's own feed.

export const CONSENT_COOKIE = 'aw_consent'
export type ConsentValue = 'accepted' | 'declined'

// Client-only: plain document.cookie read, no dependency on cookies-next
// so this stays cheap enough to call from hot UI paths.
export function getClientConsent(): ConsentValue | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`))
  const value = match ? decodeURIComponent(match[1]) : null
  return value === 'accepted' || value === 'declined' ? value : null
}

export function hasPersonalizationConsent(): boolean {
  return getClientConsent() === 'accepted'
}

export function setClientConsent(value: ConsentValue) {
  if (typeof document === 'undefined') return
  const maxAge = 60 * 60 * 24 * 365 // 1 year
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${maxAge}; samesite=lax`
}
