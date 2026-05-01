import { NextRequest } from "next/server";

export const maxDuration = 120; // 2 minutes — site can be slow
import * as cheerio from "cheerio";
import axios from "axios";
import https from "https";

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

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const r = await axios.get(url, { headers: HEADERS, timeout: 25000, httpsAgent, maxRedirects: 5, responseType: "text", validateStatus: s => s < 500 });
    return r.status >= 400 ? null : String(r.data);
  } catch { return null; }
}

async function fetchApi(url: string): Promise<{ data: any; total: number; totalPages: number }> {
  const r = await axios.get(url, {
    headers: { ...HEADERS, Accept: "application/json" },
    timeout: 30000, httpsAgent, validateStatus: s => s < 500,
  });
  const total = parseInt(r.headers["x-wp-total"] || "0", 10);
  const totalPages = parseInt(r.headers["x-wp-totalpages"] || "1", 10);
  return { data: r.data, total, totalPages };
}

// Extract variants from detail page data-product_variations
function parseVariants(html: string, fallbackPrice: string): ExtractedVariant[] {
  const $ = cheerio.load(html);
  const raw = $("form.variations_form").attr("data-product_variations") || "";
  if (!raw) return [{ packingVolume: "", customerPrice: fallbackPrice }];

  try {
    const vars: any[] = JSON.parse(raw);
    const result: ExtractedVariant[] = [];
    for (const v of vars) {
      const attr = v.attributes || {};
      const label = Object.values(attr).filter(Boolean).join(" / ");
      const price = v.display_price != null ? String(Math.round(v.display_price)) : fallbackPrice;
      if (label) result.push({ packingVolume: label, customerPrice: price });
    }
    return result.length ? result : [{ packingVolume: "", customerPrice: fallbackPrice }];
  } catch {
    return [{ packingVolume: "", customerPrice: fallbackPrice }];
  }
}

// Build product from WC Store API item
async function buildProduct(item: any, origin: string): Promise<ExtractedProduct | null> {
  if (!item?.name) return null;

  const name     = clean(item.name);
  const link     = item.permalink || `${origin}/product/${item.slug}/`;
  const imageUrl = item.images?.[0]?.src || "";
  const outofstock = !item.is_in_stock;
  const apiPrice = item.prices?.price
    ? String(Math.round(parseInt(item.prices.price, 10) / 100))
    : "";

  let variants: ExtractedVariant[] = [];

  if (item.variations?.length) {
    // Variable product — fetch detail page for data-product_variations
    const html = await fetchHtml(link);
    if (html) {
      variants = parseVariants(html, apiPrice);
    } else {
      variants = [{ packingVolume: "", customerPrice: apiPrice }];
    }
  } else {
    variants = [{ packingVolume: "", customerPrice: apiPrice }];
  }

  return {
    productName: name, genericName: "",
    category: item.categories?.[0]?.name || "",
    subCategory: "", subsubCategory: "", productType: "",
    description: clean(item.description ? item.description.replace(/<[^>]+>/g, " ") : ""),
    dosage: "",
    productLink: link, imageUrl, outofstock, variants,
  };
}

function sseEvent(enc: TextEncoder, data: object) {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

const PER_PAGE = 16;

export async function POST(req: NextRequest) {
  const { url, page = 1 } = await req.json().catch(() => ({}));
  if (!url) return new Response(JSON.stringify({ error: "URL required" }), { status: 400 });

  let parsed: URL;
  try { parsed = new URL(url); } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400 });
  }

  const origin = parsed.origin;
  // Extract last non-empty path segment as category slug
  const segments = parsed.pathname.replace(/\.html?$/, "").split("/").filter(Boolean);
  const categorySlug = segments[segments.length - 1] || "";

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (d: object) => { try { controller.enqueue(sseEvent(enc, d)); } catch {} };

      try {
        send({ type: "status", message: "Fetching products…" });

        const apiUrl = `${origin}/wp-json/wc/store/v1/products?category=${encodeURIComponent(categorySlug)}&per_page=${PER_PAGE}&page=${page}&orderby=date&order=desc`;
        const { data: items, total, totalPages } = await fetchApi(apiUrl);

        if (!Array.isArray(items) || !items.length) {
          send({ type: "error", message: "No products found. Check the category URL." });
          controller.close(); return;
        }

        send({ type: "total", total: items.length });
        send({ type: "page_info", currentPage: page, totalPages, totalCount: total });

        // Simple products in one go, variable products in batches of 4
        const simple   = items.filter((i: any) => !i.variations?.length);
        const variable = items.filter((i: any) =>  i.variations?.length);

        // Stream simple products immediately
        for (const item of simple) {
          const p = await buildProduct(item, origin);
          if (p) send({ type: "product", product: p });
        }

        // Variable products in batches of 2 (each needs a detail page fetch)
        for (let i = 0; i < variable.length; i += 2) {
          const batch = variable.slice(i, i + 2);
          const results = await Promise.all(batch.map((item: any) => buildProduct(item, origin)));
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
