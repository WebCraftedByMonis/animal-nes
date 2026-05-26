import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeText, xmlEscape } from "@/lib/xml-sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Correct canonical domain — must match what nginx actually serves (no www).
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

// ─── Debug-aware sanitizer ────────────────────────────────────────────────────
// Logs to stderr whenever sanitization actually changes a value so you can
// identify which product IDs and fields have corrupted data.
// Remove the console.warn block (not the function) once xmllint is clean.
function sf(productId: number, field: string, raw: unknown): string {
  const rawStr = raw == null ? "" : String(raw);
  const cleaned = sanitizeText(rawStr);
  if (cleaned !== rawStr) {
    const rawBytes  = Buffer.byteLength(rawStr,  "utf8");
    const cleanBytes = Buffer.byteLength(cleaned, "utf8");
    console.warn(
      `[feed-sanitize] id=${productId} field=${field} ` +
      `raw_bytes=${rawBytes} clean_bytes=${cleanBytes}`
    );
  }
  // XML-escape after sanitization — & must be first to avoid double-escaping.
  return cleaned
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
  if (p.genericName)       parts.push(`Generic: ${p.genericName}`);
  if (p.category)          parts.push(`Category: ${p.category}`);
  if (p.subCategory)       parts.push(`Type: ${p.subCategory}`);
  if (p.productType)       parts.push(`Form: ${p.productType}`);
  if (p.dosage)            parts.push(`Dosage: ${p.dosage}`);
  if (p.company?.companyName) parts.push(`By: ${p.company.companyName}`);
  return parts.length > 0
    ? `${p.productName} — ${parts.join(". ")}.`
    : `${p.productName} - Quality veterinary product available at Animal Wellness Shop.`;
}

function buildItemXml(p: any, currency: string): string {
  const rawImageUrl = p.image?.url ? ensureHttps(p.image.url) : null;
  if (!rawImageUrl) return "";

  // xmlEscape for URLs — no mojibake/control-char stripping needed for URLs,
  // but we still need to escape & < > " ' for valid XML attribute content.
  const imageUrl = xmlEscape(rawImageUrl);

  const availability = p.outofstock ? "out of stock" : "in stock";

  // All DB-sourced text goes through sf() — sanitizeText + XML escape + debug log.
  const description = sf(p.id, "description", buildDescription(p));
  const brand       = sf(p.id, "brand", p.company?.companyName || p.partner?.partnerName || "Animal Wellness");

  // Each taxonomy segment is sanitized individually; separator is the
  // literal entity &gt; (already a valid XML text-node character sequence).
  const productType = [p.category, p.subCategory, p.subsubCategory]
    .filter(Boolean)
    .map((s: string) => sf(p.id, "productType_segment", s))
    .join(" &gt; ");

  // googleCategory comes from a hardcoded map — pre-escaped, safe to inline.
  const googleCategory =
    GOOGLE_CATEGORY_MAP[p.category ?? ""] ??
    "Animals &amp; Pet Supplies &gt; Pet Supplies";

  const pricedVariants = p.variants.filter((v: any) => v.customerPrice != null);
  const feedVariants   = pricedVariants.length > 0 ? pricedVariants : p.variants.slice(0, 1);
  const hasMultipleVariants = feedVariants.length > 1;

  let xml = "";
  for (const v of feedVariants) {
    const price  = v.customerPrice != null ? `${v.customerPrice} ${currency}` : null;
    const itemId = v.id ? `${p.id}-${v.id}` : String(p.id);
    const title  = sf(p.id, "title", `${p.productName}${v.packingVolume ? ` ${v.packingVolume}` : ""}`);

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
      ${p.genericName ? `<g:mpn>${sf(p.id, "mpn", p.genericName)}</g:mpn>` : ""}
      ${productType ? `<g:product_type>${productType}</g:product_type>` : ""}
      <g:google_product_category>${googleCategory}</g:google_product_category>
      ${v.packingVolume ? `<g:size>${sf(p.id, "size", v.packingVolume)}</g:size>` : ""}
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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const header =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n` +
        `  <channel>\n` +
        `    <title>Animal Wellness Shop - Veterinary Products</title>\n` +
        `    <link>${BASE_URL}</link>\n` +
        `    <description>Quality veterinary products, pet care supplies and animal health solutions from Animal Wellness Shop.</description>\n`;

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
      // Nginx caches this for 1 hour; Google re-fetches every 24 h.
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
