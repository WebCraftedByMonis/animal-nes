import { NextRequest } from "next/server";
import * as cheerio from "cheerio";
import axios from "axios";
import https from "https";

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

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  Referer: "https://petcornerdubai.com/",
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

function resolveUrl(base: string, href: string): string {
  if (!href) return "";
  if (href.startsWith("http") || href.startsWith("//"))
    return href.startsWith("//") ? "https:" + href : href;
  try { return new URL(href, base).href; } catch { return href; }
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await axios.get(url, {
      headers: HEADERS,
      timeout: 20000,
      httpsAgent,
      maxRedirects: 5,
      responseType: "text",
      validateStatus: (s) => s < 500,
    });
    if (res.status >= 400) return null;
    return typeof res.data === "string" ? res.data : String(res.data);
  } catch (e: any) {
    console.log(`[petcornerdubai] ✗ ${e.message}`);
    return null;
  }
}

// Collect product links from category listing page
function getProductLinks(html: string, origin: string): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const links: string[] = [];

  $('a[href*="/product/"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href) return;
    const abs = resolveUrl(origin, href);
    try {
      const u = new URL(abs);
      if (u.origin !== origin) return;
      // Must match /digits/product/ pattern
      if (!/\/\d+\/product\//.test(u.pathname)) return;
      const key = `${u.origin}${u.pathname}`;
      if (!seen.has(key)) { seen.add(key); links.push(key); }
    } catch { /* skip */ }
  });

  return links;
}

// Detect next page
function getNextPage(html: string, currentUrl: string, origin: string): string | null {
  const $ = cheerio.load(html);

  const nextHref = $('a[rel="next"], .pagination a.next, li.next a, a.next-page').attr("href") || "";
  if (nextHref) return resolveUrl(origin, nextHref);

  // Try ?page= increment
  const parsed = new URL(currentUrl);
  const currentPage = parseInt(parsed.searchParams.get("page") || "1", 10);
  if ($(`a[href*="page=${currentPage + 1}"]`).length > 0) {
    parsed.searchParams.set("page", String(currentPage + 1));
    return parsed.href;
  }

  return null;
}

// Parse a PetCorner Dubai product detail page
function parseDetailPage(html: string, url: string): ExtractedProduct | null {
  const $ = cheerio.load(html);
  const origin = new URL(url).origin;

  // ── Name, description, image, brand from JSON-LD ──────────────────────────
  let name = "", description = "", imageUrl = "", genericName = "";

  try {
    const ldMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (ldMatch) {
      const ld = JSON.parse(ldMatch[1]);
      if (ld["@type"] === "Product") {
        name         = clean(ld.name || "");
        description  = clean(ld.description || "").substring(0, 3000);
        imageUrl     = Array.isArray(ld.image) ? ld.image[0] : (ld.image || "");
        genericName  = ld.brand?.name || "";
      }
    }
  } catch { /* fallback */ }

  // DOM fallbacks for name / image
  if (!name) name = clean($("h1, .product-name, .product-title").first().text());
  if (!name) return null;

  if (!imageUrl) {
    imageUrl = $('img[src*="/uploads/products/"]').first().attr("src") || "";
    if (imageUrl) imageUrl = resolveUrl(origin, imageUrl);
  }
  if (!imageUrl) imageUrl = $('meta[property="og:image"]').attr("content") || "";

  // ── Price ─────────────────────────────────────────────────────────────────
  let price = "";

  // 1. Regex: find the "Selling price (Inc.Tax)" / Inc.Tax price in raw HTML
  const incTaxMatch = html.match(/Inc\s*\.?\s*Tax[^A-Z0-9]*AED\s*([\d,]+(?:\.\d+)?)/i);
  if (incTaxMatch) price = incTaxMatch[1].replace(/,/g, "");

  // 2. Any AED price in the page
  if (!price) {
    const aedMatch = html.match(/AED\s*([\d,]+(?:\.\d+)?)/);
    if (aedMatch) price = aedMatch[1].replace(/,/g, "");
  }

  // Round to integer
  if (price) {
    const n = parseFloat(price);
    if (!isNaN(n)) price = String(Math.round(n));
  }

  // ── Variants ──────────────────────────────────────────────────────────────
  const variants: ExtractedVariant[] = [];

  // Select-based variants
  $("select option").each((_, el) => {
    const val = clean($(el).text());
    if (!val || /choose|select|pick|--/i.test(val)) return;
    const dataPrice = $(el).attr("data-price") || "";
    const vPrice = dataPrice ? String(Math.round(parseFloat(dataPrice))) : price;
    variants.push({ packingVolume: val, customerPrice: vPrice });
  });

  // Radio/button variants
  if (!variants.length) {
    $('input[type="radio"][name*="option"], input[type="radio"][name*="variant"]').each((_, el) => {
      const val = clean($(el).attr("value") || $(el).closest("label").text() || "");
      if (val) variants.push({ packingVolume: val, customerPrice: price });
    });
  }

  if (!variants.length) variants.push({ packingVolume: "", customerPrice: price });

  // ── Stock ─────────────────────────────────────────────────────────────────
  const outofstock = /out.of.stock|sold.out|not.available/i.test(html);

  return {
    productName: name, genericName,
    category: "", subCategory: "", subsubCategory: "", productType: "",
    description, dosage: "",
    productLink: url, imageUrl, outofstock, variants,
  };
}

// ── SSE helper ────────────────────────────────────────────────────────────────
function sseEvent(enc: TextEncoder, data: object): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { url } = await req.json().catch(() => ({}));
  if (!url) return new Response(JSON.stringify({ error: "URL is required" }), { status: 400 });

  let parsed: URL;
  try { parsed = new URL(url); } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400 });
  }

  const origin = parsed.origin;
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(sseEvent(enc, data)); } catch { /* disconnected */ }
      };

      try {
        send({ type: "status", message: "Fetching category page…" });

        const html = await fetchHtml(url);
        if (!html) { send({ type: "error", message: "Could not fetch the page." }); controller.close(); return; }

        const links = getProductLinks(html, origin);
        if (!links.length) {
          send({ type: "error", message: "No products found. The category page may load products via JavaScript — try a different URL." });
          controller.close(); return;
        }

        send({ type: "total", total: links.length });

        const nextPage = getNextPage(html, url, origin);

        // Scrape detail pages in batches of 3
        for (let i = 0; i < links.length; i += 3) {
          const batch = links.slice(i, i + 3);
          const results = await Promise.all(batch.map(async (link) => {
            const h = await fetchHtml(link);
            return h ? parseDetailPage(h, link) : null;
          }));
          for (const p of results) if (p) send({ type: "product", product: p });
        }

        if (nextPage) send({ type: "next_page", url: nextPage });
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
