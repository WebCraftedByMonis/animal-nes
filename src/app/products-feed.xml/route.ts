import { NextResponse } from "next/server";

const BASE_URL = "https://www.animalwellness.shop";

// Maps product categories to Google's taxonomy IDs
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

function buildDescription(p: any): string {
  if (p.description && p.description.trim().length > 20) {
    return p.description.trim();
  }
  // Build a meaningful description from available fields
  const parts: string[] = [];
  if (p.genericName) parts.push(`Generic: ${p.genericName}`);
  if (p.category) parts.push(`Category: ${p.category}`);
  if (p.subCategory) parts.push(`Type: ${p.subCategory}`);
  if (p.productType) parts.push(`Form: ${p.productType}`);
  if (p.dosage) parts.push(`Dosage: ${p.dosage}`);
  if (p.company?.companyName) parts.push(`By: ${p.company.companyName}`);

  if (parts.length > 0) {
    return `${p.productName} — ${parts.join(". ")}.`;
  }
  return `${p.productName} - Quality veterinary product available at Animal Wellness Shop.`;
}

export async function GET() {
  const res = await fetch(`${BASE_URL}/api/product?limit=1000&sortBy=createdAt&sortOrder=desc`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return new NextResponse("Failed to fetch products", { status: 500 });
  }

  const json = await res.json();
  const products = (json.data || json || []).filter(
    (p: any) => p.isActive !== false
  );

  const items = products
    .flatMap((p: any) => {
      const variants = (p.variants || []).filter((v: any) => v.customerPrice);
      // If no priced variants, use first variant anyway for the feed entry
      const feedVariants = variants.length > 0 ? variants : (p.variants?.length > 0 ? [p.variants[0]] : [null]);

      const image = p.image?.url ? ensureHttps(p.image.url) : null;
      if (!image) return []; // Google requires an image

      const availability = p.outofstock ? "out of stock" : "in stock";
      const description = escapeXml(buildDescription(p));
      const brand = escapeXml(p.company?.companyName || p.partner?.partnerName || "Animal Wellness");
      const productType = [p.category, p.subCategory, p.subsubCategory]
        .filter(Boolean)
        .map(escapeXml)
        .join(" &gt; ");
      const googleCategory = GOOGLE_CATEGORY_MAP[p.category || ""] || "Animals &amp; Pet Supplies &gt; Pet Supplies";

      return feedVariants.map((v: any) => {
        const price = v?.customerPrice ? `${v.customerPrice} PKR` : null;
        const variantSuffix = v?.packingVolume ? ` ${v.packingVolume}` : "";
        const itemId = v?.id ? `${p.id}-${v.id}` : String(p.id);
        const title = escapeXml(`${p.productName}${variantSuffix}`);

        return `
    <item>
      <g:id>${itemId}</g:id>
      <g:title><![CDATA[${title}]]></g:title>
      <g:description><![CDATA[${description}]]></g:description>
      <g:link>${BASE_URL}/products/${p.id}</g:link>
      <g:image_link>${image}</g:image_link>
      <g:availability>${availability}</g:availability>
      ${price ? `<g:price>${price}</g:price>` : ""}
      <g:condition>new</g:condition>
      <g:brand><![CDATA[${brand}]]></g:brand>
      <g:identifier_exists>no</g:identifier_exists>
      ${p.genericName ? `<g:mpn><![CDATA[${escapeXml(p.genericName)}]]></g:mpn>` : ""}
      ${productType ? `<g:product_type><![CDATA[${productType}]]></g:product_type>` : ""}
      <g:google_product_category>${googleCategory}</g:google_product_category>
      ${v?.packingVolume ? `<g:size><![CDATA[${escapeXml(v.packingVolume)}]]></g:size>` : ""}
      ${p.productType ? `<g:item_group_id>${p.id}</g:item_group_id>` : ""}
    </item>`;
      });
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Animal Wellness Shop - Veterinary Products</title>
    <link>${BASE_URL}</link>
    <description>Quality veterinary products, pet care supplies and animal health solutions from Animal Wellness Shop.</description>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
