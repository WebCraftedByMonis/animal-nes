import { NextRequest } from "next/server";
import * as cheerio from "cheerio";
import axios from "axios";
import https from "https";

export const maxDuration = 120;

export interface ExtractedVariant {
  packingVolume: string;
  customerPrice: string;
}

export interface ExtractedProduct {
  productName: string;
  genericName: string;
  category: string;
  subCategory: string;
  subsubCategory: string;
  productType: string;
  description: string;
  dosage: string;
  productLink: string;
  imageUrl: string;
  outofstock: boolean;
  variants: ExtractedVariant[];
}

const clean = (s: string) => (s || "").replace(/\s+/g, " ").replace(/&#8211;/g, "–").trim();
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  Referer: "https://petsone.pk/",
};

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const r = await axios.get(url, {
      headers: HEADERS, timeout: 20000, httpsAgent,
      maxRedirects: 5, responseType: "text", validateStatus: s => s < 500,
    });
    return r.status >= 400 ? null : String(r.data);
  } catch { return null; }
}

// Collect all product URLs from paginated category pages
async function collectProductUrls(startUrl: string): Promise<string[]> {
  const seen = new Set<string>();
  const urls: string[] = [];
  let pageUrl: string | null = startUrl;

  while (pageUrl) {
    const html = await fetchHtml(pageUrl);
    if (!html) break;

    const re = /href="(https?:\/\/petsone\.pk\/product\/[^"]+\/)"/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const u = m[1];
      if (!seen.has(u)) { seen.add(u); urls.push(u); }
    }

    // Follow rel="next" pagination
    const nextMatch = html.match(/<link rel="next" href="([^"]+)"/);
    pageUrl = nextMatch ? nextMatch[1] : null;
  }

  return urls;
}

function parseProductPage(html: string, url: string): ExtractedProduct | null {
  const $ = cheerio.load(html);

  // Extract all JSON-LD blocks
  let productLd: any = null;
  let breadcrumbLd: any = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const ld = JSON.parse($(el).html() || "");
      const graph: any[] = ld["@graph"] || (Array.isArray(ld) ? ld : [ld]);
      for (const node of graph) {
        if (node["@type"] === "Product") productLd = node;
        if (node["@type"] === "BreadcrumbList") breadcrumbLd = node;
      }
    } catch {}
  });

  if (!productLd) return null;

  const name = clean(productLd.name || $("h1.product_title").first().text());
  if (!name) return null;

  // Image — JSON-LD image or og:image
  let imageUrl = "";
  const ldImg = productLd.image;
  if (typeof ldImg === "string") imageUrl = ldImg;
  else if (ldImg?.url) imageUrl = String(ldImg.url);
  else if (ldImg?.contentUrl) imageUrl = String(ldImg.contentUrl);
  if (!imageUrl) imageUrl = $('meta[property="og:image"]').attr("content") || "";

  // Description — short description div or JSON-LD
  let description = clean($(".woocommerce-product-details__short-description").text()).substring(0, 3000);
  if (!description || description === name) {
    description = clean(String(productLd.description || "")).substring(0, 3000);
    if (description === name) description = "";
  }

  // Brand
  const brand = clean(
    productLd.brand?.name ||
    $('meta[property="product:brand"]').attr("content") ||
    $(".wd-product-brands a").first().text() || ""
  );

  // Categories from BreadcrumbList — skip Home (pos 1) and Shop (pos 2) and product name (last)
  let category = "", subCategory = "", subsubCategory = "";
  if (breadcrumbLd?.itemListElement) {
    const items: Array<{ position: number; name: string }> = breadcrumbLd.itemListElement
      .filter((i: any) => i.item) // last item (product name) has no item URL
      .sort((a: any, b: any) => a.position - b.position)
      .slice(2); // skip Home and Shop
    category      = clean(items[0]?.name || "");
    subCategory   = clean(items[1]?.name || "");
    subsubCategory = clean(items[2]?.name || "");
  }
  if (!category) category = clean($('meta[property="product:category"]').attr("content") || "");

  // Price — from offers priceSpecification or og:price meta
  const offers = productLd.offers ? (Array.isArray(productLd.offers) ? productLd.offers : [productLd.offers]) : [];
  const variants: ExtractedVariant[] = [];

  for (const offer of offers) {
    const specs: any[] = Array.isArray(offer.priceSpecification) ? offer.priceSpecification : [];
    // Use first spec without a priceType (= sale/actual price)
    const actualSpec = specs.find((s: any) => !s.priceType) || specs[0];
    const price = actualSpec?.price
      ? String(Math.round(parseFloat(String(actualSpec.price))))
      : String(Math.round(parseFloat(String(offer.price || "0"))));

    const inStock = /InStock/i.test(String(offer.availability || ""));

    // For variable products each offer might have a name
    const variantName = clean(offer.name || "");
    variants.push({ packingVolume: variantName, customerPrice: price });

    // Only use first offer if no variant names (simple product)
    if (!variantName && variants.length === 1) break;
  }

  if (!variants.length) {
    const fallbackPrice = $('meta[property="product:price:amount"]').attr("content") || "";
    variants.push({ packingVolume: "", customerPrice: fallbackPrice });
  }

  const outofstock = offers.length > 0
    ? offers.every((o: any) => !/InStock/i.test(String(o.availability || "")))
    : /out.of.stock|sold.out/i.test(html);

  return {
    productName: name,
    genericName: brand,
    category,
    subCategory,
    subsubCategory,
    productType: "",
    description,
    dosage: "",
    productLink: url,
    imageUrl,
    outofstock,
    variants,
  };
}

function sseEvent(enc: TextEncoder, data: object) {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  const { url } = await req.json().catch(() => ({}));
  if (!url) return new Response(JSON.stringify({ error: "URL required" }), { status: 400 });

  try { new URL(url); } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400 });
  }

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (d: object) => { try { controller.enqueue(sseEvent(enc, d)); } catch {} };

      try {
        send({ type: "status", message: "Collecting product links from category pages…" });

        const productUrls = await collectProductUrls(url);
        if (!productUrls.length) {
          send({ type: "error", message: "No products found. Check the URL." });
          controller.close(); return;
        }

        send({ type: "total", total: productUrls.length });
        send({ type: "status", message: `Found ${productUrls.length} products. Scraping details…` });

        // Fetch detail pages in batches of 5
        for (let i = 0; i < productUrls.length; i += 5) {
          const batch = productUrls.slice(i, i + 5);
          const results = await Promise.all(batch.map(async (pUrl) => {
            const html = await fetchHtml(pUrl);
            return html ? parseProductPage(html, pUrl) : null;
          }));
          for (const p of results) if (p) send({ type: "product", product: p });
        }

        send({ type: "done" });
      } catch (e: any) {
        send({ type: "error", message: e.message || "Scraping failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
