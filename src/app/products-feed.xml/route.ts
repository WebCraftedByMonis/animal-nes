import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeText, xmlEscape } from "@/lib/xml-sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductRow = {
  id: number;
  productName: string;
  genericName: string | null;
  description: string | null;
  category: string | null;
  subCategory: string | null;
  subsubCategory: string | null;
  productType: string | null;
  dosage: string | null;
  outofstock: boolean;
  company: { companyName: string | null } | null;
  partner: { partnerName: string | null } | null;
  image: { url: string } | null;
  variants: { id: number; packingVolume: string | null; customerPrice: number | null }[];
};

interface FeedBuilder {
  channelOpen: () => string;
  buildItem: (p: ProductRow, currency: string) => string;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

// Logs to stderr whenever sanitization changes a value so you can identify
// which product IDs and fields have corrupted data.
function sf(productId: number, field: string, raw: unknown): string {
  const rawStr = raw == null ? "" : String(raw);
  const cleaned = sanitizeText(rawStr);
  if (cleaned !== rawStr) {
    const rawBytes   = Buffer.byteLength(rawStr,   "utf8");
    const cleanBytes = Buffer.byteLength(cleaned, "utf8");
    console.warn(
      `[feed-sanitize] id=${productId} field=${field} ` +
      `raw_bytes=${rawBytes} clean_bytes=${cleanBytes}`
    );
  }
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
  if (p.genericName)           parts.push(`Generic: ${p.genericName}`);
  if (p.category)              parts.push(`Category: ${p.category}`);
  if (p.subCategory)           parts.push(`Type: ${p.subCategory}`);
  if (p.productType)           parts.push(`Form: ${p.productType}`);
  if (p.dosage)                parts.push(`Dosage: ${p.dosage}`);
  if (p.company?.companyName)  parts.push(`By: ${p.company.companyName}`);
  return parts.length > 0
    ? `${p.productName} — ${parts.join(". ")}.`
    : `${p.productName} - Quality veterinary product available at Animal Wellness Shop.`;
}

// ─── Google feed builder ──────────────────────────────────────────────────────
// Output is identical to the original route — no behavioural changes.

function buildGoogleItem(p: ProductRow, currency: string): string {
  const rawImageUrl = p.image?.url ? ensureHttps(p.image.url) : null;
  if (!rawImageUrl) return "";

  const imageUrl     = xmlEscape(rawImageUrl);
  const availability = p.outofstock ? "out of stock" : "in stock";
  const description  = sf(p.id, "description", buildDescription(p));
  const brand        = sf(p.id, "brand", p.company?.companyName || p.partner?.partnerName || "Animal Wellness");

  const productType = [p.category, p.subCategory, p.subsubCategory]
    .filter((s): s is string => s != null && s !== "")
    .map((s) => sf(p.id, "productType_segment", s))
    .join(" &gt; ");

  const googleCategory =
    GOOGLE_CATEGORY_MAP[p.category ?? ""] ??
    "Animals &amp; Pet Supplies &gt; Pet Supplies";

  const pricedVariants = p.variants.filter((v) => v.customerPrice != null);
  if (pricedVariants.length === 0) return "";
  const feedVariants = pricedVariants;
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

const googleBuilder: FeedBuilder = {
  channelOpen: () =>
    `  <channel>\n` +
    `    <title>Animal Wellness Shop - Veterinary Products</title>\n` +
    `    <link>${BASE_URL}</link>\n` +
    `    <description>Quality veterinary products, pet care supplies and animal health solutions from Animal Wellness Shop.</description>\n`,
  buildItem: buildGoogleItem,
};

// ─── Meta feed builder ────────────────────────────────────────────────────────
// Confirmed Meta Commerce Manager RSS fields used here:
//   g:id, g:title, g:description, g:link, g:image_link, g:availability,
//   g:price, g:condition, g:brand, g:mpn, g:google_product_category,
//   g:product_type, g:size, g:item_group_id
// Omitted vs Google:
//   g:identifier_exists — not in Meta's confirmed catalog field spec
// Source: developers.facebook.com/docs/marketing-api/catalog/reference

function buildMetaItem(p: ProductRow, currency: string): string {
  const rawImageUrl = p.image?.url ? ensureHttps(p.image.url) : null;
  if (!rawImageUrl) return "";

  const imageUrl     = xmlEscape(rawImageUrl);
  const availability = p.outofstock ? "out of stock" : "in stock";
  const description  = sf(p.id, "description", buildDescription(p));
  const brand        = sf(p.id, "brand", p.company?.companyName || p.partner?.partnerName || "Animal Wellness");

  const productType = [p.category, p.subCategory, p.subsubCategory]
    .filter((s): s is string => s != null && s !== "")
    .map((s) => sf(p.id, "productType_segment", s))
    .join(" &gt; ");

  const googleCategory =
    GOOGLE_CATEGORY_MAP[p.category ?? ""] ??
    "Animals &amp; Pet Supplies &gt; Pet Supplies";

  const pricedVariants  = p.variants.filter((v) => v.customerPrice != null);
  const feedVariants    = pricedVariants.length > 0 ? pricedVariants : p.variants.slice(0, 1);
  const hasMultipleVariants = feedVariants.length > 1;

  // Skip products without price — Meta rejects unprice items at review time.
  if (pricedVariants.length === 0) return "";

  let xml = "";
  for (const v of feedVariants) {
    if (v.customerPrice == null) continue;

    const price  = `${v.customerPrice} ${currency}`;
    const itemId = v.id ? `${p.id}-${v.id}` : String(p.id);
    const title  = sf(p.id, "title", `${p.productName}${v.packingVolume ? ` ${v.packingVolume}` : ""}`);

    xml += `    <item>
      <g:id>${itemId}</g:id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${BASE_URL}/products/${p.id}</g:link>
      <g:image_link>${imageUrl}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${price}</g:price>
      <g:condition>new</g:condition>
      <g:brand>${brand}</g:brand>
      ${p.genericName ? `<g:mpn>${sf(p.id, "mpn", p.genericName)}</g:mpn>` : ""}
      ${productType ? `<g:product_type>${productType}</g:product_type>` : ""}
      <g:google_product_category>${googleCategory}</g:google_product_category>
      ${v.packingVolume ? `<g:size>${sf(p.id, "size", v.packingVolume)}</g:size>` : ""}
      ${hasMultipleVariants ? `<g:item_group_id>${p.id}</g:item_group_id>` : ""}
    </item>\n`;
  }
  return xml;
}

const metaBuilder: FeedBuilder = {
  channelOpen: () =>
    `  <channel>\n` +
    `    <title>Animal Wellness Shop - Product Catalog</title>\n` +
    `    <link>${BASE_URL}</link>\n` +
    `    <description>Veterinary products, pet care supplies and animal health solutions — Meta Commerce catalog for Animal Wellness Shop.</description>\n`,
  buildItem: buildMetaItem,
};

// ─── Platform dispatch map ────────────────────────────────────────────────────

const BUILDERS: Record<string, FeedBuilder> = {
  google: googleBuilder,
  meta:   metaBuilder,
};

// ─── Route handler ────────────────────────────────────────────────────────────
// GET /products-feed.xml?platform=google&country=PK  → Google feed, PKR
// GET /products-feed.xml?platform=google&country=AE  → Google feed, AED
// GET /products-feed.xml?platform=meta&country=PK    → Meta feed,   PKR
// GET /products-feed.xml?platform=meta&country=AE    → Meta feed,   AED
// Unknown platform falls back to google.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platformParam = (searchParams.get("platform") ?? "google").toLowerCase();
  const countryParam  = (searchParams.get("country")  ?? "PK").toUpperCase();

  const currency = countryParam === "AE" ? "AED" : "PKR";
  const builder  = BUILDERS[platformParam] ?? BUILDERS.google;

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
      controller.enqueue(encoder.encode(
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n` +
        builder.channelOpen()
      ));

      for (const p of products) {
        const chunk = builder.buildItem(p as ProductRow, currency);
        if (chunk) controller.enqueue(encoder.encode(chunk));
      }

      controller.enqueue(encoder.encode("  </channel>\n</rss>"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
