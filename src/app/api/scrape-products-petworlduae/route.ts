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
  Referer: "https://petworlduae.com/",
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const isImageUrl = (u: string) =>
  /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(u) &&
  !u.includes("placeholder") &&
  !u.includes("logo");

function resolveUrl(base: string, href: string): string {
  if (!href) return "";
  if (href.startsWith("http") || href.startsWith("//"))
    return href.startsWith("//") ? "https:" + href : href;
  try { return new URL(href, base).href; } catch { return href; }
}

async function fetchHtml(url: string): Promise<string | null> {
  console.log(`[FETCH] → ${url}`);
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
    console.log(`[FETCH] ✗ ${e.message}`);
    return null;
  }
}

// ── Collect product links from ONE BigCommerce listing page ───────────────────
function getProductLinks(html: string, origin: string, listingPath: string): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const links: string[] = [];

  $("li.product a[href], article.product a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href) return;
    const abs = resolveUrl(origin, href);
    try {
      const u = new URL(abs);
      if (u.origin !== origin) return;
      // Skip if same as listing page, or cart/account/etc
      if (u.pathname === listingPath) return;
      if (/\/(cart|account|login|wishlist|search|blog|contact|brands|sitemap)/i.test(u.pathname)) return;
      const key = `${u.origin}${u.pathname}`.replace(/\/$/, "");
      if (!seen.has(key)) { seen.add(key); links.push(key); }
    } catch { /* skip */ }
  });

  return links;
}

// ── Detect next page for BigCommerce (?page=N) ────────────────────────────────
function getNextPage(html: string, currentUrl: string, origin: string): string | null {
  const $ = cheerio.load(html);

  // Standard pagination link
  const nextHref = $("a.pagination-item--next, li.pagination-item--next a").attr("href") || "";
  if (nextHref) return resolveUrl(origin, nextHref);

  // Numbered pages: find current page number and build next
  const parsed = new URL(currentUrl);
  const currentPage = parseInt(parsed.searchParams.get("page") || "1", 10);
  const hasMorePages = $(`a[href*='page=${currentPage + 1}'], a[href*='?page=']`).length > 0;
  if (hasMorePages) {
    parsed.searchParams.set("page", String(currentPage + 1));
    return parsed.href;
  }

  return null;
}

// ── Decode BODL Base64 JSON (optional — for price/brand/category hints) ───────
function decodeBodlPriceMap(html: string): Map<string, number> {
  const map = new Map<string, number>();
  const match = html.match(/JSON\.parse\s*\(\s*(?:atob|decodeBase64)\s*\(\s*["']([A-Za-z0-9+/=]+)["']\s*\)\s*\)/);
  if (!match) return map;
  try {
    const obj = JSON.parse(Buffer.from(match[1], "base64").toString("utf-8"));
    const list: any[] = obj?.product_impression || obj?.page?.product_impression || [];
    for (const item of list) {
      if (item.product_name && item.purchase_price != null)
        map.set(clean(item.product_name).toLowerCase(), item.sale_price ?? item.purchase_price);
    }
  } catch { /* skip */ }
  return map;
}

// ── Parse a BigCommerce detail page ──────────────────────────────────────────
function parseDetailPage(html: string, url: string, bodlPriceMap: Map<string, number>): ExtractedProduct | null {
  const $ = cheerio.load(html);
  const origin = new URL(url).origin;

  const name = clean(
    $(".productView-title, h1.product-title, h1[itemprop='name']").first().text() ||
    $('meta[property="og:title"]').attr("content") || ""
  );
  if (!name) return null;

  // Image
  const imgCandidates = [
    $(".productView-image img, .productView-img-container img").first().attr("data-zoom-image"),
    $(".productView-image img, .productView-img-container img").first().attr("src"),
    $('meta[property="og:image"]').attr("content"),
  ];
  const rawImage = imgCandidates.find(c => c && isImageUrl(c)) || "";
  const imageUrl = rawImage ? rawImage.replace(/\/\d+x\d+\//, "/1280x1280/") : "";

  // Price — BCData JSON → DOM → BODL
  let price = "";
  const bcDataMatch = html.match(/window\.BCData\s*=\s*({[\s\S]*?})(?:\s*;|\s*<\/script>)/);
  if (bcDataMatch) {
    try {
      const bcData = JSON.parse(bcDataMatch[1]);
      const val = bcData?.product_attributes?.price?.with_tax?.value ??
                  bcData?.product_attributes?.price?.without_tax?.value;
      if (val != null) price = String(Math.round(val));
    } catch { /* fallback */ }
  }
  if (!price) price = clean($("span.price.sale-price-cal, .price.sale-price-cal").first().text()).replace(/[^\d.]/g, "");
  if (!price) price = clean($("span.price, .price").first().text()).replace(/[^\d.]/g, "");
  if (!price) {
    const bodlVal = bodlPriceMap.get(name.toLowerCase());
    if (bodlVal != null) price = String(Math.round(bodlVal));
  }

  // Variants
  const variants: ExtractedVariant[] = [];
  $("select[data-product-attribute] option, select[name*='attribute'] option, select[name*='modifier'] option").each((_, el) => {
    const val = clean($(el).text());
    const dataPrice = $(el).attr("data-calculated-price") || "";
    if (val && !/choose|select|pick/i.test(val))
      variants.push({ packingVolume: val, customerPrice: dataPrice ? String(Math.round(parseFloat(dataPrice))) : price });
  });
  if (!variants.length) {
    $("input[type='radio'][data-product-attribute]").each((_, el) => {
      const val = clean($(el).attr("value") || "");
      if (val) variants.push({ packingVolume: val, customerPrice: price });
    });
  }
  if (!variants.length) variants.push({ packingVolume: "", customerPrice: price });

  // Description
  $("script, style, nav, header, footer, noscript").remove();
  const description = clean(
    $(".productView-description .productView-description-tabContent").text() ||
    $(".productView-description").text() ||
    $('[data-tab-content="description"]').text() ||
    $('meta[property="og:description"]').attr("content") || ""
  ).substring(0, 3000);

  // Dosage tab
  let dosage = "";
  $(".tab-content, [data-tab-content]").each((_, el) => {
    const heading = clean($(el).prev().text() || $(el).find("h2,h3,h4").first().text());
    if (/direction|dosage|feeding|usage|how to|administration/i.test(heading)) {
      dosage = clean($(el).text()).substring(0, 1000);
      return false;
    }
  });

  const genericName = clean($('[data-product-brand], .productView-brand a').first().text());
  const outofstock = $(".out-of-stock, .stock-unavailable").length > 0;

  return {
    productName: name, genericName,
    category: "", subCategory: "", subsubCategory: "", productType: "",
    description, dosage,
    productLink: url, imageUrl, outofstock, variants,
  };
}

// ── SSE helper ────────────────────────────────────────────────────────────────
function sseEvent(enc: TextEncoder, data: object): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

// ── POST — SSE stream, ONE listing page at a time ─────────────────────────────
export async function POST(req: NextRequest) {
  const { url } = await req.json().catch(() => ({}));
  if (!url) return new Response(JSON.stringify({ error: "URL is required" }), { status: 400 });

  let parsed: URL;
  try { parsed = new URL(url); } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400 });
  }

  const origin = parsed.origin;
  const listingPath = parsed.pathname.replace(/\/$/, "");
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(sseEvent(enc, data)); } catch { /* disconnected */ }
      };

      try {
        send({ type: "status", message: "Fetching listing page…" });

        const html = await fetchHtml(url);
        if (!html) { send({ type: "error", message: "Could not fetch the page." }); controller.close(); return; }

        const links = getProductLinks(html, origin, listingPath);
        if (!links.length) { send({ type: "error", message: "No products found on this page." }); controller.close(); return; }

        send({ type: "total", total: links.length });

        // Decode BODL for price hints
        const bodlPriceMap = decodeBodlPriceMap(html);

        // Detect next page
        const nextPage = getNextPage(html, url, origin);

        // Scrape detail pages in batches of 3
        for (let i = 0; i < links.length; i += 3) {
          const batch = links.slice(i, i + 3);
          const results = await Promise.all(batch.map(async (link) => {
            const h = await fetchHtml(link);
            return h ? parseDetailPage(h, link, bodlPriceMap) : null;
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
