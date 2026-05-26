import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeForXml } from "@/lib/xml-sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Correct canonical domain — must match what nginx actually serves (no www).
// The www domain 301-redirects to this, so Merchant Center landing page
// checks will fail if we use www here.
const BASE_URL = "https://animalwellness.shop";

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

function buildItemXml(p: any, currency: string): string {
  const imageUrl = p.image?.url ? ensureHttps(p.image.url) : null;
  if (!imageUrl) return "";

  const availability = p.outofstock ? "out of stock" : "in stock";
  const description = sanitizeForXml(buildDescription(p));
  const brand = sanitizeForXml(
    p.company?.companyName || p.partner?.partnerName || "Animal Wellness"
  );
  // Product type hierarchy — each segment sanitized individually, joined with
  // the literal text " > " which sanitizeForXml would escape to " &gt; ".
  // We build the escaped string manually so the separator is preserved.
  const productType = [p.category, p.subCategory, p.subsubCategory]
    .filter(Boolean)
    .map((s: string) => sanitizeForXml(s))
    .join(" &gt; ");
  const googleCategory =
    GOOGLE_CATEGORY_MAP[p.category ?? ""] ??
    "Animals &amp; Pet Supplies &gt; Pet Supplies";

  const pricedVariants = p.variants.filter((v: any) => v.customerPrice != null);
  const feedVariants =
    pricedVariants.length > 0 ? pricedVariants : p.variants.slice(0, 1);
  const hasMultipleVariants = feedVariants.length > 1;

  let xml = "";
  for (const v of feedVariants) {
    const price =
      v.customerPrice != null ? `${v.customerPrice} ${currency}` : null;
    const itemId = v.id ? `${p.id}-${v.id}` : String(p.id);
    const title = sanitizeForXml(`${p.productName}${v.packingVolume ? ` ${v.packingVolume}` : ""}`);

    xml += `    <item>
      <g:id>${itemId}</g:id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${BASE_URL}/products/${p.id}</g:link>
      <g:image_link>${imageUrl}</g:image_link>
      <g:availability>${availability}</g:availability>
      ${price ? `<g:price>${price}</g:price>` : ""}
      <g:condition>new</g:condition>
      <g:brand>${brand}</g:brand>
      <g:identifier_exists>no</g:identifier_exists>
      ${p.genericName ? `<g:mpn>${sanitizeForXml(p.genericName)}</g:mpn>` : ""}
      ${productType ? `<g:product_type>${productType}</g:product_type>` : ""}
      <g:google_product_category>${googleCategory}</g:google_product_category>
      ${v.packingVolume ? `<g:size>${sanitizeForXml(v.packingVolume)}</g:size>` : ""}
      ${hasMultipleVariants ? `<g:item_group_id>${p.id}</g:item_group_id>` : ""}
    </item>\n`;
  }
  return xml;
}

// GET /products-feed.xml?country=PK  → PKR (default)
// GET /products-feed.xml?country=AE  → AED
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const countryParam = (searchParams.get("country") ?? "PK").toUpperCase();
  const currency = countryParam === "AE" ? "AED" : "PKR";

  // Fetch all products in one DB query (efficient with indexed columns).
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

  // Stream the XML response so the first byte reaches Google immediately
  // after the DB query completes — rather than assembling the full 100 MB+
  // string in memory before sending anything.
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const header = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Animal Wellness Shop - Veterinary Products</title>
    <link>${BASE_URL}</link>
    <description>Quality veterinary products, pet care supplies and animal health solutions from Animal Wellness Shop.</description>\n`;

      controller.enqueue(encoder.encode(header));

      for (const p of products) {
        const chunk = buildItemXml(p, currency);
        if (chunk) {
          controller.enqueue(encoder.encode(chunk));
        }
      }

      controller.enqueue(encoder.encode("  </channel>\n</rss>"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Nginx will cache this at the proxy layer for 1 hour.
      // Google re-fetches feeds every 24 h so 1-hour CDN TTL keeps data fresh.
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      // Transfer-Encoding: chunked is set automatically by the streaming response.
    },
  });
}
