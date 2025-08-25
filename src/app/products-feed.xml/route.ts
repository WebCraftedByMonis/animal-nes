import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = "https://www.animalwellness.shop";

  // Fetch products from your own API
  const res = await fetch(`${baseUrl}/api/product`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return new NextResponse("Failed to fetch products", { status: 500 });
  }

  const { data: products } = await res.json();

  // Build XML items, filtering out products without required fields
 const items = products
  .map((p: any) => {
    // get first variant if exists
    const variant = p.variants?.[0];

    const price = variant?.customerPrice
      ? `${variant.customerPrice} PKR`
      : null;

    const image = p.image?.url || null;
    const availability = p.outofstock ? "out of stock" : "in stock";
    const description = p.description || "No description available";

    // skip if price or image missing
    if (!price || !image) return null;

    return `
      <item>
        <g:id>${p.id}</g:id>
        <g:title><![CDATA[${p.productName}]]></g:title>
        <g:description><![CDATA[${description}]]></g:description>
        <g:link>${baseUrl}/products/${p.id}</g:link>
        <g:image_link>${image}</g:image_link>
        <g:availability>${availability}</g:availability>
        <g:price>${price}</g:price>
        <g:condition>new</g:condition>
        <g:brand>AnimalWellness</g:brand>
      </item>
    `;
  })
  .filter(Boolean) // remove nulls
  .join("");


  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
    <channel>
      <title>AnimalWellness Products</title>
      <link>${baseUrl}</link>
      <description>Veterinary products from AnimalWellness.shop</description>
      ${items}
    </channel>
  </rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
