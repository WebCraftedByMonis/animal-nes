// Canonical public site URL. Behind the nginx reverse proxy the app sees
// Host: localhost:3000, so anything derived from the request (req.nextUrl.origin,
// req.headers.get('host')) resolves to the internal address instead of the
// public domain — always prefer this env var for building absolute URLs.
export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://animalwellness.shop'
  ).replace(/\/$/, '');
}
