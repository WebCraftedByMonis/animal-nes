import { NextRequest } from "next/server";
import * as cheerio from "cheerio";
import axios from "axios";
import https from "https";

export const maxDuration = 120;

export interface ExtractedVariant { packingVolume: string; customerPrice: string; }
export interface ExtractedProduct {
  productName: string; genericName: string;
  category: string; subCategory: string; subsubCategory: string; productType: string;
  description: string; dosage: string;
  productLink: string; imageUrl: string; outofstock: boolean;
  variants: ExtractedVariant[];
}

const clean = (s: string) => (s || "").replace(/\s+/g, " ").trim();
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

async function fetchText(url: string): Promise<string | null> {
  try {
    const r = await axios.get(url, {
      headers: HEADERS, timeout: 20000, httpsAgent,
      maxRedirects: 5, responseType: "text", validateStatus: s => s < 500,
    });
    return r.status >= 400 ? null : String(r.data);
  } catch { return null; }
}

// ── Parse sitemap-products.xml → array of product URLs ───────────────────────
function parseSitemap(xml: string): string[] {
  const urls: string[] = [];
  const re = /<loc>(https?:\/\/[^<]+\/products\/[^<]+)<\/loc>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) urls.push(m[1].trim());
  return urls;
}

// ── Parse one product detail page ────────────────────────────────────────────
function parseProduct(html: string, url: string): ExtractedProduct | null {
  const $ = cheerio.load(html);

  // Name
  const name = clean($("h1").first().text());
  if (!name) return null;

  // ── Image ──────────────────────────────────────────────────────────────────
  let imageUrl = "";

  // JSON-LD Product schema (most reliable — Shopify always includes this)
  $('script[type="application/ld+json"]').each((_, el) => {
    if (imageUrl) return;
    try {
      const ld = JSON.parse($(el).html() || "");
      const node: any = ld["@type"] === "Product" ? ld
        : Array.isArray(ld["@graph"]) ? (ld["@graph"] as any[]).find((n: any) => n["@type"] === "Product") : null;
      if (!node) return;
      const img = node.image;
      if (typeof img === "string") imageUrl = img;
      else if (Array.isArray(img) && img[0]) imageUrl = typeof img[0] === "string" ? img[0] : (img[0].url || "");
      else if (img?.url) imageUrl = String(img.url);
    } catch {}
  });

  if (!imageUrl) {
    imageUrl = $('meta[property="og:image"]').attr("content") ||
               $('meta[name="og:image"]').attr("content") || "";
  }

  // Shopify CDN product image (handles headless sites where og:image isn't in static HTML)
  if (!imageUrl) {
    $('img[src*="cdn.shopify.com"][src*="/products/"], img[data-src*="cdn.shopify.com"][data-src*="/products/"]').each((_, el) => {
      if (imageUrl) return;
      imageUrl = $(el).attr("src") || $(el).attr("data-src") || "";
    });
  }

  if (imageUrl.startsWith("//")) imageUrl = "https:" + imageUrl;

  // ── Price ──────────────────────────────────────────────────────────────────
  let price = "";
  const priceMatch = html.match(/AED\s*([\d,]+(?:\.\d+)?)/);
  if (priceMatch) price = String(Math.round(parseFloat(priceMatch[1].replace(/,/g, ""))));

  // ── Variants ──────────────────────────────────────────────────────────────
  const variants: ExtractedVariant[] = [];
  const sizeRe = /^\s*(\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|lb|oz|gm|grams?|litre?s?|pack|pc|pcs|pieces?|count|tabs?|capsules?)\s*(?:x\s*\d+)?)\s*$/i;

  $("button, [role='button'], li, option").each((_, el) => {
    const txt = clean($(el).text());
    if (sizeRe.test(txt) && txt.length < 30) {
      const already = variants.some(v => v.packingVolume.toLowerCase() === txt.toLowerCase());
      if (!already) variants.push({ packingVolume: txt, customerPrice: price });
    }
  });

  if (!variants.length) variants.push({ packingVolume: "", customerPrice: price });

  // ── Description ───────────────────────────────────────────────────────────
  let description = "";

  // 1. JSON-LD description (clean, no nav garbage)
  $('script[type="application/ld+json"]').each((_, el) => {
    if (description) return;
    try {
      const ld = JSON.parse($(el).html() || "");
      const node: any = ld["@type"] === "Product" ? ld
        : Array.isArray(ld["@graph"]) ? (ld["@graph"] as any[]).find((n: any) => n["@type"] === "Product") : null;
      if (node?.description) description = clean(String(node.description)).substring(0, 3000);
    } catch {}
  });

  // 2. Text-based: extract between "Product Description" heading and next section
  if (!description) {
    $("script, style, noscript").remove();
    const bodyText = clean($("body").text());
    const idx = bodyText.search(/Product\s+Description/i);
    if (idx >= 0) {
      let chunk = bodyText.slice(idx).replace(/^Product\s+Description\s*/i, "").trimStart();
      if (chunk.toLowerCase().startsWith(name.toLowerCase())) {
        chunk = chunk.slice(name.length).trimStart();
      }
      const cutoff = chunk.search(/Nutritional\s+Info|Feeding\s+Instructions?|Technical\s+details|Ingredients\s*[-–—]/i);
      if (cutoff > 50) chunk = chunk.slice(0, cutoff);
      if (chunk.length > 80) description = clean(chunk).substring(0, 3000);
    }
  }

  // 3. Specific CSS selectors (no broad class* wildcards that match the full page)
  if (!description) {
    $("nav, header, footer").remove();
    const descEl = $(
      ".product__description, .product-description, #description, #tab-description, " +
      "[data-tab-content='description'], [data-product-description]"
    ).first();
    if (descEl.length) description = clean(descEl.text()).substring(0, 3000);
  }

  // 4. Longest <p> fallback
  if (!description) {
    let longest = "";
    $("p").each((_, el) => {
      const t = clean($(el).text());
      if (t.length > longest.length && t.length > 100) longest = t;
    });
    description = longest.substring(0, 3000);
  }

  // ── Category ──────────────────────────────────────────────────────────────
  const category = clean(
    $("[class*='breadcrumb'] a, [class*='Breadcrumb'] a").last().text() ||
    $('meta[property="product:category"]').attr("content") || ""
  );

  const outofstock = /out.of.stock|sold.out|unavailable/i.test(html);

  return {
    productName: name, genericName: "",
    category, subCategory: "", subsubCategory: "", productType: "",
    description, dosage: "",
    productLink: url, imageUrl, outofstock, variants,
  };
}

function sseEvent(enc: TextEncoder, data: object) {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

const PAGE_SIZE = 48;

export async function POST(req: NextRequest) {
  const { url, page = 1 } = await req.json().catch(() => ({}));
  if (!url) return new Response(JSON.stringify({ error: "URL required" }), { status: 400 });

  let origin: string;
  try { origin = new URL(url).origin; } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400 });
  }

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (d: object) => { try { controller.enqueue(sseEvent(enc, d)); } catch {} };

      try {
        // ── Step 1: fetch sitemap ────────────────────────────────────────────
        send({ type: "status", message: "Loading product catalog from sitemap…" });

        const sitemapXml = await fetchText(`${origin}/sitemap-products.xml`);
        if (!sitemapXml) {
          send({ type: "error", message: "Could not load the product sitemap." });
          controller.close(); return;
        }

        const allUrls = parseSitemap(sitemapXml);
        if (!allUrls.length) {
          send({ type: "error", message: "No products found in sitemap." });
          controller.close(); return;
        }

        const totalPages = Math.ceil(allUrls.length / PAGE_SIZE);
        const pageUrls = allUrls.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

        send({ type: "total", total: pageUrls.length });
        send({ type: "page_info", currentPage: page, totalPages, totalCount: allUrls.length });

        // ── Step 2: scrape each product detail page in batches of 4 ─────────
        for (let i = 0; i < pageUrls.length; i += 4) {
          const batch = pageUrls.slice(i, i + 4);
          const results = await Promise.all(batch.map(async (pUrl) => {
            const html = await fetchText(pUrl);
            return html ? parseProduct(html, pUrl) : null;
          }));
          for (const p of results) if (p) send({ type: "product", product: p });
        }

        if (page < totalPages) send({ type: "next_page", url, page: page + 1 });
        send({ type: "done" });
      } catch (e: any) {
        send({ type: "error", message: e.message || "Scraping failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
  });
}
