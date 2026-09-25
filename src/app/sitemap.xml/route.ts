import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSiteUrl } from '@/lib/site-url';
import { PRODUCTS_PER_SITEMAP, MAX_PRODUCT_URLS, PRODUCT_SITEMAP_QUALITY_GATE } from '../sitemap/[id]/route';

export const dynamic = 'force-dynamic';

const BASE_URL = getSiteUrl();

export async function GET() {
  // Count against the SAME quality gate buildProductSitemap() filters on
  // (see that file — PRODUCT_SITEMAP_QUALITY_GATE is shared, not copied) so
  // this index doesn't advertise empty trailing chunks — capped at
  // MAX_PRODUCT_URLS since that's the real ceiling regardless of how many
  // products actually pass the gate.
  const [{ qualifying }] = await prisma.$queryRaw<{ qualifying: bigint }[]>`
    SELECT COUNT(*) as qualifying
    FROM Product p
    WHERE ${PRODUCT_SITEMAP_QUALITY_GATE}
  `;
  const productCount = Math.min(Number(qualifying), MAX_PRODUCT_URLS);
  const productChunks = Math.max(1, Math.ceil(productCount / PRODUCTS_PER_SITEMAP));
  const ids = [0, ...Array.from({ length: productChunks }, (_, i) => i + 1)];

  const sitemaps = ids
    .map(id => `  <sitemap>\n    <loc>${BASE_URL}/sitemap/${id}.xml</loc>\n  </sitemap>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
