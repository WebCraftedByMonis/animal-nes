import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://animalwellness.shop';
const PRODUCTS_PER_SITEMAP = 5000;

export async function GET() {
  const productCount = await prisma.product.count({ where: { isActive: true } });
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
