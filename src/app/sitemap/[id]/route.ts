import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PARTNER_TYPE_GROUPS } from '@/lib/partner-constants';
import { SellStatus } from '@prisma/client';
import { getAllCategories } from '@/lib/category-utils';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://animalwellness.shop';
const PRODUCTS_PER_SITEMAP = 5000;

type Entry = {
  url: string;
  lastModified?: Date | string | null;
  changeFrequency?: string;
  priority?: number;
};

function toXml(entries: Entry[]): string {
  const urls = entries
    .map(e => {
      const lastmod = e.lastModified
        ? `    <lastmod>${new Date(e.lastModified as Date).toISOString().split('T')[0]}</lastmod>\n`
        : '';
      const freq = e.changeFrequency
        ? `    <changefreq>${e.changeFrequency}</changefreq>\n`
        : '';
      const pri =
        e.priority !== undefined ? `    <priority>${e.priority}</priority>\n` : '';
      return `  <url>\n    <loc>${e.url}</loc>\n${lastmod}${freq}${pri}  </url>`;
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

async function buildNonProductSitemap(): Promise<Entry[]> {
  const now = new Date();
  const [partners, companies, news, vacancies, jobPosts, sellAnimals, dynamicForms] =
    await Promise.all([
      prisma.partner.findMany({ select: { id: true, partnerType: true, updatedAt: true } }),
      prisma.company.findMany({ select: { id: true, updatedAt: true } }),
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
    ]);

  const allCategories = await getAllCategories()
  const categoryPages: Entry[] = [
    { url: `${BASE_URL}/category`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    ...allCategories.map((c) => ({
      url: `${BASE_URL}/category/${c.slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.85,
    })),
  ]

  const staticPages: Entry[] = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/findDoctor`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/jobvacancy`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    {
      url: `${BASE_URL}/traditionaljobposts`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/Veternarians`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/VeterinaryAssistants`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    { url: `${BASE_URL}/Students`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/Sales`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/Companies`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/buy`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/animal-news`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/Applicants`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE_URL}/Faculty`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/Farmers`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    {
      url: `${BASE_URL}/master-trainer`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    { url: `${BASE_URL}/forms`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ];

  const partnerPages = partners
    .map(p => {
      const url = getPartnerUrl(p.partnerType, p.id);
      if (!url) return null;
      return { url, lastModified: p.updatedAt ?? now, changeFrequency: 'monthly', priority: 0.6 };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const companyPages = companies.map(c => ({
    url: `${BASE_URL}/Companies/${c.id}`,
    lastModified: c.updatedAt ?? now,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  const newsPages = news.map(n => ({
    url: `${BASE_URL}/animal-news/${n.id}`,
    lastModified: n.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const vacancyPages = vacancies.map(v => ({
    url: `${BASE_URL}/jobvacancy/${v.id}`,
    lastModified: v.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const jobPostPages = jobPosts.map(j => ({
    url: `${BASE_URL}/traditionaljobposts/${j.id}`,
    lastModified: j.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const animalPages = sellAnimals.map(a => ({
    url: `${BASE_URL}/buy/${a.id}`,
    lastModified: a.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const formPages = dynamicForms.map(f => ({
    url: `${BASE_URL}/forms/${f.slug}`,
    lastModified: f.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...categoryPages,
    ...partnerPages,
    ...companyPages,
    ...newsPages,
    ...vacancyPages,
    ...jobPostPages,
    ...animalPages,
    ...formPages,
  ].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

async function buildProductSitemap(id: number): Promise<Entry[]> {
  const skip = (id - 1) * PRODUCTS_PER_SITEMAP;
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, updatedAt: true },
    skip,
    take: PRODUCTS_PER_SITEMAP,
    orderBy: { id: 'asc' },
  });
  return products.map(p => ({
    url: `${BASE_URL}/products/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));
}

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
    numId === 0 ? await buildNonProductSitemap() : await buildProductSitemap(numId);

  return new NextResponse(toXml(entries), {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
