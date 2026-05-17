import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Requires Node.js runtime — Prisma doesn't run in the Edge runtime.
export const runtime = "nodejs";
// Never pre-render during build — always generate at request time.
// This prevents next build from hitting the DB from the build machine.
export const dynamic = "force-dynamic";

const BASE_URL = "https://www.animalwellness.shop";

const GOOGLE_CATEGORY_MAP: Record<string, string> = {
  "Veterinary": "Animals &amp; Pet Supplies &gt; Pet Supplies",
  "Poultry": "Animals &amp; Pet Supplies &gt; Pet Supplies",
  "Pets": "Animals &amp; Pet Supplies &gt; Pet Supplies",
  "Equine": "Animals &amp; Pet Supplies &gt; Pet Supplies &gt; Horse Supplies",
  "Livestock Feed": "Animals &amp; Pet Supplies &gt; Pet Supplies",
  "Poultry Feed": "Animals &amp; Pet Supplies &gt; Pet Supplies",
  "Instruments & Equipment": "Animals &amp; Pet Supplies &gt; Pet Supplies",
  "Fisheries & Aquaculture": "Animals &amp; Pet Supplies &gt; Pet Supplies",
  "Herbal / Organic Products": "Animals &amp; Pet Supplies &gt; Pet Supplies",
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function ensureHttps(url: string): string {
  return url.replace(/^http:\/\//, "https://");
}

function buildDescription(p: {
  description?: string | null;
  genericName?: string | null;
  category?: string | null;
  subCategory?: string | null;
  productType?: string | null;
  dosage?: string | null;
  productName: string;
  company?: { companyName?: string | null } | null;
}): string {
  if (p.description && p.description.trim().length > 20) {
    return p.description.trim();
  }
  const parts: string[] = [];
  if (p.genericName) parts.push(`Generic: ${p.genericName}`);
  if (p.category) parts.push(`Category: ${p.category}`);
  if (p.subCategory) parts.push(`Type: ${p.subCategory}`);
  if (p.productType) parts.push(`Form: ${p.productType}`);
  if (p.dosage) parts.push(`Dosage: ${p.dosage}`);
  if (p.company?.companyName) parts.push(`By: ${p.company.companyName}`);
  return parts.length > 0
    ? `${p.productName} — ${parts.join(". ")}.`
    : `${p.productName} - Quality veterinary product available at Animal Wellness Shop.`;
}

// GET /products-feed.xml
// GET /products-feed.xml?country=PK   → prices in PKR  (default)
// GET /products-feed.xml?country=AE   → prices in AED
//
// Register BOTH URLs as separate data sources in Google Merchant Center:
//   Pakistan feed : /products-feed.xml?country=PK
//   UAE feed      : /products-feed.xml?country=AE
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const countryParam = (searchParams.get("country") ?? "PK").toUpperCase();
  const currency = countryParam === "AE" ? "AED" : "PKR";

  // Query the database directly.
  // No HTTP self-call, no hardcoded limit — all active products are exported.
  // Only the columns required to build the feed are selected to keep memory usage low.
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      productName: true,
      genericName: true,
      description: true,
      category: true,
      subCategory: true,
      subsubCategory: true,
      productType: true,
      dosage: true,
      outofstock: true,
      company: { select: { companyName: true } },
      partner: { select: { partnerName: true } },
      image: { select: { url: true } },
      variants: {
        select: { id: true, packingVolume: true, customerPrice: true },
      },
    },
    orderBy: { id: "asc" },
  });

  // Build the XML response by appending string segments rather than building
  // one giant in-memory string, which keeps peak memory lower for large catalogs.
  const xmlParts: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "  <channel>",
    "    <title>Animal Wellness Shop - Veterinary Products</title>",
    `    <link>${BASE_URL}</link>`,
    "    <description>Quality veterinary products, pet care supplies and animal health solutions from Animal Wellness Shop.</description>",
  ];

  for (const p of products) {
    const imageUrl = p.image?.url ? ensureHttps(p.image.url) : null;
    // Google Merchant Center rejects items without an image.
    if (!imageUrl) continue;

    const availability = p.outofstock ? "out of stock" : "in stock";
    const description = escapeXml(buildDescription(p));
    const brand = escapeXml(
      p.company?.companyName || p.partner?.partnerName || "Animal Wellness"
    );
    const productType = [p.category, p.subCategory, p.subsubCategory]
      .filter(Boolean)
      .map((s) => escapeXml(s!))
      .join(" &gt; ");
    const googleCategory =
      GOOGLE_CATEGORY_MAP[p.category ?? ""] ??
      "Animals &amp; Pet Supplies &gt; Pet Supplies";

    // Prefer variants that actually have a customer price set.
    // Fall back to the first variant so the product isn't silently dropped.
    const pricedVariants = p.variants.filter((v) => v.customerPrice != null);
    const feedVariants =
      pricedVariants.length > 0 ? pricedVariants : p.variants.slice(0, 1);

    // When a product has multiple variants they share an item_group_id so
    // Google can group them as colour/size variants in Shopping.
    const hasMultipleVariants = feedVariants.length > 1;

    for (const v of feedVariants) {
      const price =
        v.customerPrice != null ? `${v.customerPrice} ${currency}` : null;
      const variantSuffix = v.packingVolume ? ` ${v.packingVolume}` : "";
      const itemId = v.id ? `${p.id}-${v.id}` : String(p.id);
      const title = escapeXml(`${p.productName}${variantSuffix}`);

      xmlParts.push(
        `    <item>
      <g:id>${itemId}</g:id>
      <g:title><![CDATA[${title}]]></g:title>
      <g:description><![CDATA[${description}]]></g:description>
      <g:link>${BASE_URL}/products/${p.id}</g:link>
      <g:image_link>${imageUrl}</g:image_link>
      <g:availability>${availability}</g:availability>
      ${price ? `<g:price>${price}</g:price>` : ""}
      <g:condition>new</g:condition>
      <g:brand><![CDATA[${brand}]]></g:brand>
      <g:identifier_exists>no</g:identifier_exists>
      ${p.genericName ? `<g:mpn><![CDATA[${escapeXml(p.genericName)}]]></g:mpn>` : ""}
      ${productType ? `<g:product_type><![CDATA[${productType}]]></g:product_type>` : ""}
      <g:google_product_category>${googleCategory}</g:google_product_category>
      ${v.packingVolume ? `<g:size><![CDATA[${escapeXml(v.packingVolume)}]]></g:size>` : ""}
      ${hasMultipleVariants ? `<g:item_group_id>${p.id}</g:item_group_id>` : ""}
    </item>`
      );
    }
  }

  xmlParts.push("  </channel>", "</rss>");

  return new NextResponse(xmlParts.join("\n"), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Cache for 1 hour at the CDN layer. Google re-fetches feeds every 24 h
      // so a 1-hour CDN TTL means near-fresh data without hammering the DB.
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
