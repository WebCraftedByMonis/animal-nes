import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { PARTNER_TYPE_GROUPS } from "@/lib/partner-constants";
import { SellStatus } from "@prisma/client";

// Revalidate the sitemap index and all child sitemaps every hour.
export const revalidate = 3600;

const BASE_URL = "https://www.animalwellness.shop";

// Each product-chunk sitemap contains at most this many URLs.
// Google's per-file limit is 50,000; 5,000 keeps individual files small and
// makes ISR revalidation faster.
const PRODUCTS_PER_SITEMAP = 5000;

// ─── Sitemap index ────────────────────────────────────────────────────────────
// Next.js 15 generates a sitemap *index* at /sitemap.xml pointing to
// /sitemap/0.xml, /sitemap/1.xml … automatically when generateSitemaps is
// exported.  ID 0 = static + non-product dynamic pages.  IDs 1-N = product
// chunks of PRODUCTS_PER_SITEMAP each.
export async function generateSitemaps() {
  const productCount = await prisma.product.count({ where: { isActive: true } });
  const productChunks = Math.max(1, Math.ceil(productCount / PRODUCTS_PER_SITEMAP));
  return [
    { id: 0 },
    ...Array.from({ length: productChunks }, (_, i) => ({ id: i + 1 })),
  ];
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  if (id === 0) {
    return buildNonProductSitemap();
  }
  return buildProductSitemap(id);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPartnerUrl(
  partnerType: string | null | undefined,
  id: number
): string | null {
  if (!partnerType) return null;
  // Cast so TypeScript doesn't complain about readonly string[] vs string[]
  const g = PARTNER_TYPE_GROUPS as Record<string, readonly string[]>;
  if (g.veterinarian.includes(partnerType))
    return `${BASE_URL}/Veternarians/${id}`;
  if (g.sales.includes(partnerType)) return `${BASE_URL}/Sales/${id}`;
  if (g.veterinary_assistant.includes(partnerType))
    return `${BASE_URL}/VeterinaryAssistants/${id}`;
  if (g.student.includes(partnerType)) return `${BASE_URL}/Students/${id}`;
  if (g.faculty.includes(partnerType)) return `${BASE_URL}/Faculty/${id}`;
  if (g.farmer.includes(partnerType)) return `${BASE_URL}/Farmers/${id}`;
  return null;
}

// ─── Sitemap 0: static + all non-product dynamic pages ───────────────────────
async function buildNonProductSitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // All queries run in parallel; we only select the fields we actually use
  // so this stays fast even on large tables.
  const [
    partners,
    companies,
    news,
    vacancies,
    jobPosts,
    sellAnimals,
    dynamicForms,
  ] = await Promise.all([
    prisma.partner.findMany({
      select: { id: true, partnerType: true, updatedAt: true },
    }),
    prisma.company.findMany({
      select: { id: true, updatedAt: true },
    }),
    prisma.animalNews.findMany({
      where: { isActive: true },
      select: { id: true, updatedAt: true },
    }),
    prisma.jobForm.findMany({
      select: { id: true, updatedAt: true },
    }),
    prisma.traditionalJobPost.findMany({
      select: { id: true, updatedAt: true },
    }),
    prisma.sellAnimal.findMany({
      where: { status: SellStatus.ACCEPTED },
      select: { id: true, updatedAt: true },
    }),
    prisma.dynamicForm.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  // ── Static pages ──────────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/products`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/findDoctor`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/jobvacancy`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/traditionaljobposts`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/Veternarians`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/VeterinaryAssistants`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/Students`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/Sales`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/Companies`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/buy`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/animal-news`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/Applicants`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/Faculty`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/Farmers`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/master-trainer`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/forms`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  // ── Partner pages (veterinarians, sales, VAs, students, faculty, farmers) ─
  const partnerPages: MetadataRoute.Sitemap = partners
    .map((p) => {
      const url = getPartnerUrl(p.partnerType, p.id);
      if (!url) return null;
      return {
        url,
        lastModified: p.updatedAt ?? now,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  // ── Company pages ─────────────────────────────────────────────────────────
  const companyPages: MetadataRoute.Sitemap = companies.map((c) => ({
    url: `${BASE_URL}/Companies/${c.id}`,
    lastModified: c.updatedAt ?? now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  // ── Animal news pages ─────────────────────────────────────────────────────
  const newsPages: MetadataRoute.Sitemap = news.map((n) => ({
    url: `${BASE_URL}/animal-news/${n.id}`,
    lastModified: n.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // ── Job vacancy pages ─────────────────────────────────────────────────────
  const vacancyPages: MetadataRoute.Sitemap = vacancies.map((v) => ({
    url: `${BASE_URL}/jobvacancy/${v.id}`,
    lastModified: v.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // ── Traditional job post pages ────────────────────────────────────────────
  const jobPostPages: MetadataRoute.Sitemap = jobPosts.map((j) => ({
    url: `${BASE_URL}/traditionaljobposts/${j.id}`,
    lastModified: j.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // ── Buy / sell-animal listing pages ──────────────────────────────────────
  const animalPages: MetadataRoute.Sitemap = sellAnimals.map((a) => ({
    url: `${BASE_URL}/buy/${a.id}`,
    lastModified: a.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // ── Dynamic form pages ────────────────────────────────────────────────────
  const formPages: MetadataRoute.Sitemap = dynamicForms.map((f) => ({
    url: `${BASE_URL}/forms/${f.slug}`,
    lastModified: f.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...partnerPages,
    ...companyPages,
    ...newsPages,
    ...vacancyPages,
    ...jobPostPages,
    ...animalPages,
    ...formPages,
  ].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

// ─── Sitemaps 1…N: product pages ─────────────────────────────────────────────
async function buildProductSitemap(id: number): Promise<MetadataRoute.Sitemap> {
  const skip = (id - 1) * PRODUCTS_PER_SITEMAP;

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, updatedAt: true },
    skip,
    take: PRODUCTS_PER_SITEMAP,
    orderBy: { id: "asc" },
  });

  return products.map((p) => ({
    url: `${BASE_URL}/products/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
}
