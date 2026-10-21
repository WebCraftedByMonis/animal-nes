import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { PARTNER_TYPE_GROUPS } from '@/lib/partner-constants';
import { Prisma, SellStatus } from '@prisma/client';
import { toProductUrl, toSlug, isValidBrand } from '@/lib/slug-utils';
import { getAllCategories } from '@/lib/category-utils';
import { getSiteUrl } from '@/lib/site-url';

// Shared with src/app/sitemap.xml/route.ts (its chunk-count query) so the
// two never drift apart on what "qualifies" means — exactly the kind of
// divergence that left the old sitemap missing category/brand pages for
// months while a second, unwired generator script quietly had the right
// logic.
export const PRODUCT_SITEMAP_QUALITY_GATE = Prisma.sql`
  p.isActive = 1
  AND p.description IS NOT NULL AND CHAR_LENGTH(p.description) >= 200
  AND EXISTS (SELECT 1 FROM ProductImage pi WHERE pi.productId = p.id)
  AND EXISTS (SELECT 1 FROM ProductVariant v WHERE v.productId = p.id AND v.customerPrice > 0)
  AND LOWER(TRIM(p.category)) NOT IN (
    'veterinary supplies online', 'null', 'shop', 'food', 'care', 'supplements', ''
  )
`;

export const dynamic = 'force-dynamic';

const BASE_URL = getSiteUrl();
export const PRODUCTS_PER_SITEMAP = 5000;
// Deliberately NOT "every active product" (was ~50-70K with zero quality
// gating). This site is mid-recovery from a June 2026 ranking demotion
// traced to thin/duplicate content across the huge catalog, and the agreed
// strategy is to stop re-inviting Google to crawl+judge pages that haven't
// been through the AI description/category rewrite yet (bulk-descriptions.js)
// — see buildProductSitemap(). 10,000 is a queue, not a hard ceiling on
// what's indexable: sorted newest-updated-first, so every product the
// rewrite job touches rises to the top and ages back out as fresher ones
// take its place.
export const MAX_PRODUCT_URLS = 10000;

type Entry = {
  url: string;
  lastModified?: Date | string | null;
};

// No <changefreq>/<priority> — Google documents that it ignores both, and
// they were tripling the byte size of what's already a Googlebot-hit-heavy
// file on a site with a history of crawl-load problems, for zero benefit.
function toXml(entries: Entry[]): string {
  const urls = entries
    .map(e => {
      const lastmod = e.lastModified
        ? `    <lastmod>${new Date(e.lastModified as Date).toISOString().split('T')[0]}</lastmod>\n`
        : '';
      return `  <url>\n    <loc>${e.url}</loc>\n${lastmod}  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

function getPartnerUrl(partnerType: string | null | undefined, id: number): string | null {
  if (!partnerType) return null;
  const g = PARTNER_TYPE_GROUPS as Record<string, readonly string[]>;
  if (g.veterinarian.includes(partnerType)) return `${BASE_URL}/Veternarians/${id}`;
  if (g.sales.includes(partnerType)) return `${BASE_URL}/Sales/${id}`;
  if (g.veterinary_assistant.includes(partnerType)) return `${BASE_URL}/VeterinaryAssistants/${id}`;
  if (g.student.includes(partnerType)) return `${BASE_URL}/Students/${id}`;
  if (g.faculty.includes(partnerType)) return `${BASE_URL}/Faculty/${id}`;
  if (g.farmer.includes(partnerType)) return `${BASE_URL}/Farmers/${id}`;
  return null;
}

// Companies and Partners have no bio/description field in the schema at
// all — the only real content on their profile page is their logo/photo
// plus (for companies) the products they sell. A profile with neither is an
// empty shell; don't ask Google to index it. This is a MUCH smaller, safer
// place to apply a quality bar than the product catalog: these are a few
// thousand URLs, not tens of thousands.
async function buildNonProductSitemap(): Promise<Entry[]> {
  const now = new Date();
  const [partners, companies, news, vacancies, jobPosts, sellAnimals, dynamicForms, categories, brandRows] =
    await Promise.all([
      prisma.partner.findMany({
        where: { partnerImage: { isNot: null } },
        select: { id: true, partnerType: true, updatedAt: true },
      }),
      prisma.company.findMany({
        where: { image: { isNot: null }, products: { some: { isActive: true } } },
        select: { id: true, updatedAt: true },
      }),
      prisma.animalNews.findMany({
        where: { isActive: true },
        select: { id: true, updatedAt: true },
      }),
      prisma.jobForm.findMany({ select: { id: true, updatedAt: true } }),
      prisma.traditionalJobPost.findMany({ select: { id: true, updatedAt: true } }),
      prisma.sellAnimal.findMany({
        where: { status: SellStatus.ACCEPTED },
        select: { id: true, updatedAt: true },
      }),
      prisma.dynamicForm.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
      // Canonical, already-cached list of real categories (shared with the
      // site's own category nav) — reused here instead of yet another
      // one-off copy of the same "what counts as a real category" query.
      getAllCategories(),
      prisma.$queryRaw<{ companyName: string; count: bigint }[]>`
        SELECT c.companyName, COUNT(p.id) as count
        FROM Product p JOIN Company c ON p.companyId = c.id
        WHERE p.isActive = 1
        GROUP BY c.id, c.companyName
        HAVING count >= 50
        ORDER BY count DESC
      `,
    ]);

  // These are the pages the site is actually trying to rank on — they were
  // previously entirely absent from this (the live) sitemap route. A
  // separate script, generate-sitemaps.js, already built these correctly
  // but wrote to a static output directory nothing ever served; removed to
  // avoid two divergent sitemap implementations going forward.
  const categoryPages: Entry[] = categories.map(c => ({
    url: `${BASE_URL}/products/category/${c.slug}`,
    lastModified: now,
  }));

  const brandPages: Entry[] = brandRows
    .filter(r => isValidBrand(r.companyName, Number(r.count)))
    .map(r => ({
      url: `${BASE_URL}/brands/${toSlug(r.companyName)}`,
      lastModified: now,
    }));

  const staticPages: Entry[] = [
    { url: BASE_URL, lastModified: now },
    { url: `${BASE_URL}/products`, lastModified: now },
    { url: `${BASE_URL}/findDoctor`, lastModified: now },
    { url: `${BASE_URL}/about`, lastModified: now },
    { url: `${BASE_URL}/contact`, lastModified: now },
    { url: `${BASE_URL}/jobvacancy`, lastModified: now },
    { url: `${BASE_URL}/traditionaljobposts`, lastModified: now },
    { url: `${BASE_URL}/Veternarians`, lastModified: now },
    { url: `${BASE_URL}/VeterinaryAssistants`, lastModified: now },
    { url: `${BASE_URL}/Students`, lastModified: now },
    { url: `${BASE_URL}/Sales`, lastModified: now },
    { url: `${BASE_URL}/Companies`, lastModified: now },
    { url: `${BASE_URL}/buy`, lastModified: now },
    { url: `${BASE_URL}/animal-news`, lastModified: now },
    { url: `${BASE_URL}/Applicants`, lastModified: now },
    { url: `${BASE_URL}/Faculty`, lastModified: now },
    { url: `${BASE_URL}/Farmers`, lastModified: now },
    { url: `${BASE_URL}/forms`, lastModified: now },
  ];

  const partnerPages = partners
    .map(p => {
      const url = getPartnerUrl(p.partnerType, p.id);
      if (!url) return null;
      return { url, lastModified: p.updatedAt ?? now };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const companyPages = companies.map(c => ({
    url: `${BASE_URL}/Companies/${c.id}`,
    lastModified: c.updatedAt ?? now,
  }));

  const newsPages = news.map(n => ({
    url: `${BASE_URL}/animal-news/${n.id}`,
    lastModified: n.updatedAt,
  }));

  const vacancyPages = vacancies.map(v => ({
    url: `${BASE_URL}/jobvacancy/${v.id}`,
    lastModified: v.updatedAt,
  }));

  const jobPostPages = jobPosts.map(j => ({
    url: `${BASE_URL}/traditionaljobposts/${j.id}`,
    lastModified: j.updatedAt,
  }));

  const animalPages = sellAnimals.map(a => ({
    url: `${BASE_URL}/buy/${a.id}`,
    lastModified: a.updatedAt,
  }));

  const formPages = dynamicForms.map(f => ({
    url: `${BASE_URL}/forms/${f.slug}`,
    lastModified: f.updatedAt,
  }));

  return [
    ...staticPages,
    ...categoryPages,
    ...brandPages,
    ...partnerPages,
    ...companyPages,
    ...newsPages,
    ...vacancyPages,
    ...jobPostPages,
    ...animalPages,
    ...formPages,
  ];
}

// Quality-gated (PRODUCT_SITEMAP_QUALITY_GATE above), newest-updated-first,
// capped at MAX_PRODUCT_URLS — doubles as a "please recrawl what I just
// improved" queue for the nightly bulk-descriptions.js rewrite job, not a
// demand that Google index the whole catalog at once.
async function buildProductSitemap(pageNum: number): Promise<Entry[]> {
  if ((pageNum - 1) * PRODUCTS_PER_SITEMAP >= MAX_PRODUCT_URLS) return [];
  const take = Math.min(PRODUCTS_PER_SITEMAP, MAX_PRODUCT_URLS - (pageNum - 1) * PRODUCTS_PER_SITEMAP);
  const skip = (pageNum - 1) * PRODUCTS_PER_SITEMAP;

  const products = await prisma.$queryRaw<
    { id: number; productName: string; category: string | null; updatedAt: Date }[]
  >`
    SELECT p.id, p.productName, p.category, p.updatedAt
    FROM Product p
    WHERE ${PRODUCT_SITEMAP_QUALITY_GATE}
    ORDER BY p.updatedAt DESC
    LIMIT ${take} OFFSET ${skip}
  `;

  return products.map(p => ({
    url: `${BASE_URL}${toProductUrl(p)}`,
    lastModified: p.updatedAt,
  }));
}

const cachedNonProductSitemap = unstable_cache(
  buildNonProductSitemap,
  ['sitemap-non-products'],
  { revalidate: 3600 }
);

const cachedProductSitemap = unstable_cache(
  buildProductSitemap,
  ['sitemap-products'],
  { revalidate: 3600 }
);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  // Accept both /sitemap/0 and /sitemap/0.xml (strip .xml suffix if present)
  const numId = Number(String(rawId).replace(/\.xml$/, ''));

  if (isNaN(numId) || numId < 0) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const entries =
    numId === 0 ? await cachedNonProductSitemap() : await cachedProductSitemap(numId);

  return new NextResponse(toXml(entries), {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
