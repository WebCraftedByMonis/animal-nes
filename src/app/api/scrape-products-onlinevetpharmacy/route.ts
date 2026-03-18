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
  Referer: "https://onlinevetpharmacy.com/",
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const isImageUrl = (u: string) =>
  /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(u) &&
  !u.includes("placeholder") &&
  !u.includes("admin-ajax");

function resolveUrl(base: string, href: string): string {
  if (!href) return "";
  if (href.startsWith("http") || href.startsWith("//"))
    return href.startsWith("//") ? "https:" + href : href;
  try { return new URL(href, base).href; } catch { return href; }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.replace(/\/$/, "");
  } catch { return url; }
}

function toBaseUrl(url: string): string {
  try {
    const u = new URL(url);
    u.pathname = u.pathname.replace(/\/page\/\d+\/?$/, "").replace(/\/$/, "");
    u.search = "";
    return u.href;
  } catch { return url; }
}

async function fetchHtml(url: string): Promise<string | null> {
  console.log(`[FETCH] → ${url}`);
  try {
    const res = await axios.get(url, {
      headers: HEADERS,
      timeout: 25000,
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

function getProductLinks(html: string, origin: string): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const links: string[] = [];

  $([
    "li.product a.woocommerce-loop-product__link",
    "li.product a",
    ".products .product a",
    "a.woocommerce-loop-product__link",
  ].join(", ")).each((_, el) => {
    const href = $(el).attr("href") || "";
    const full = resolveUrl(origin, href);
    try {
      const u = new URL(full);
      if (u.origin !== origin) return;
      if (!/\/product\/[^/]+/.test(u.pathname)) return;
      if (/\/product-category\/|\/product-tag\//i.test(u.pathname)) return;
      const key = normalizeUrl(full);
      if (!seen.has(key)) { seen.add(key); links.push(key); }
    } catch { /* skip */ }
  });

  return links;
}

function getPaginationUrls(html: string, origin: string): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const pages: string[] = [];

  $("a.page-numbers, .woocommerce-pagination a, .pagination a, a[href*='/page/']").each((_, el) => {
    const href = $(el).attr("href") || "";
    const full = resolveUrl(origin, href);
    try {
      const u = new URL(full);
      if (u.origin !== origin) return;
      if (!/\/page\/\d+\/?/.test(u.pathname)) return;
      const key = normalizeUrl(full);
      if (!seen.has(key)) { seen.add(key); pages.push(key); }
    } catch { /* skip */ }
  });

  if (!pages.length) {
    const next = $("a.next.page-numbers, a[rel='next']").attr("href");
    if (next) {
      const full = resolveUrl(origin, next);
      if (!seen.has(full)) pages.push(full);
    }
  }

  return pages;
}

function parseProductDetail(html: string, url: string): ExtractedProduct | null {
  const $raw = cheerio.load(html);
  const origin = new URL(url).origin;

  const productName =
    clean($raw("h1.product_title, h1.product-title, h1.entry-title, h1").first().text()) ||
    clean($raw('meta[property="og:title"]').attr("content") || "");
  if (!productName) return null;

  const galleryImg = $raw(".woocommerce-product-gallery img, .wp-post-image").first();
  const imgCandidates = [
    galleryImg.attr("data-large_image"),
    galleryImg.attr("data-src"),
    galleryImg.attr("data-lazy-src"),
    galleryImg.closest("a").attr("href"),
    $raw('meta[property="og:image"]').attr("content"),
    $raw('meta[name="twitter:image"]').attr("content"),
    galleryImg.attr("src"),
  ];
  const rawImage = imgCandidates.find(c => c && isImageUrl(c)) || "";
  const imageUrl = rawImage ? resolveUrl(origin, rawImage) : "";

  let price = "";
  for (const sel of [
    ".woocommerce-Price-amount bdi",
    ".woocommerce-Price-amount",
    ".price ins .woocommerce-Price-amount",
    ".price .woocommerce-Price-amount",
    "[itemprop='price']",
  ]) {
    const raw = clean($raw(sel).first().text()).replace(/[^\d.]/g, "");
    if (raw && parseFloat(raw) > 0) { price = raw; break; }
  }

  const breadcrumb: string[] = [];
  $raw(".woocommerce-breadcrumb, .breadcrumb, nav.woocommerce-breadcrumb")
    .find("a, span").each((_, el) => {
      const t = clean($raw(el).text());
      if (t && t !== "Home" && t !== productName) breadcrumb.push(t);
    });
  const uniqueBread = [...new Set(breadcrumb)];

  const $clean = cheerio.load(html);
  $clean("script, style, nav, header, footer, noscript, .woocommerce-tabs .tabs").remove();

  let description =
    clean($clean("#tab-description").text()) ||
    clean($clean(".woocommerce-Tabs-panel--description").text()) ||
    clean($clean(".woocommerce-product-details__short-description").text()) ||
    clean($clean('meta[property="og:description"]').attr("content") || "");
  description = description.substring(0, 3000);

  let dosage = "";
  $clean(".woocommerce-Tabs-panel, .tab-pane, .wc-tab").each((_, el) => {
    const heading = clean($clean(el).find("h2, h3, h4, .panel-title").first().text());
    if (/direction|dosage|usage|how to use|feeding|instruction|administration/i.test(heading)) {
      dosage = clean($clean(el).text().replace(heading, "")).substring(0, 1000);
      return false;
    }
  });

  const genericName = clean(
    $raw(".product_meta .brand a, .product_meta [class*='brand'] a").first().text() ||
    $raw('meta[property="product:brand"]').attr("content") || ""
  );

  const variants: ExtractedVariant[] = [];
  const variationAttr = $raw("form.variations_form").attr("data-product_variations") || "";
  if (variationAttr && variationAttr !== "false") {
    try {
      const variations = JSON.parse(variationAttr);
      if (Array.isArray(variations) && variations.length > 0) {
        for (const v of variations) {
          const label = Object.values(v.attributes || {}).filter((val: any) => val).join(" / ");
          const vPrice = v.display_price != null ? String(Math.round(v.display_price)) : price;
          if (label || vPrice) variants.push({ packingVolume: label, customerPrice: vPrice });
        }
      }
    } catch { /* skip */ }
  }

  if (!variants.length) {
    $raw(".variations select option, select[name*='attribute'] option").each((_, el) => {
      const val = clean($raw(el).text());
      if (val && !/choose|select/i.test(val))
        variants.push({ packingVolume: val, customerPrice: price });
    });
  }

  if (!variants.length) variants.push({ packingVolume: "", customerPrice: price });

  const outofstock =
    $raw(".out-of-stock, .stock.out-of-stock").length > 0 ||
    /out.?of.?stock/i.test($raw(".stock").first().text());

  return {
    productName: clean(productName),
    genericName,
    category:       uniqueBread[0] || "",
    subCategory:    uniqueBread[1] || "",
    subsubCategory: uniqueBread[2] || "",
    productType: "",
    description,
    dosage,
    productLink: url,
    imageUrl,
    outofstock,
    variants,
  };
}

// ── SSE helper ────────────────────────────────────────────────────────────────
function sseEvent(enc: TextEncoder, data: object): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

// ── POST handler — streams products from ONE listing page as SSE ──────────────
// Accepts { url } — always scrapes only that single listing page.
// Sends { type: "next_page", url } if a next page exists, so the frontend
// can offer a "Load Next Page" button without fetching everything upfront.
export async function POST(req: NextRequest) {
  const { url } = await req.json().catch(() => ({}));

  if (!url) {
    return new Response(
      JSON.stringify({ error: "URL is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let parsed: URL;
  try { parsed = new URL(url); } catch {
    return new Response(
      JSON.stringify({ error: "Invalid URL" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const origin = parsed.origin;
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(sseEvent(enc, data)); } catch { /* client disconnected */ }
      };

      try {
        send({ type: "status", message: "Fetching listing page…" });

        // Fetch exactly the URL given — no auto-pagination
        const html = await fetchHtml(url);
        if (!html) {
          send({ type: "error", message: "Could not fetch the URL." });
          controller.close();
          return;
        }

        const links = getProductLinks(html, origin);

        if (!links.length) {
          // Maybe it's a single product URL
          const single = parseProductDetail(html, url);
          if (single) {
            send({ type: "total", total: 1 });
            send({ type: "product", product: single });
          } else {
            send({ type: "error", message: "No products found on this page." });
          }
          controller.close();
          return;
        }

        send({ type: "total", total: links.length });

        // Detect next page link from THIS page only
        const $ = cheerio.load(html);
        const nextHref = $("a.next.page-numbers, a[rel='next']").attr("href") || "";
        const nextPageUrl = nextHref ? resolveUrl(origin, nextHref) : null;

        // Scrape each product detail page, streaming results
        for (let i = 0; i < links.length; i += 3) {
          const batch = links.slice(i, i + 3);
          const results = await Promise.all(batch.map(async link => {
            const h = await fetchHtml(link);
            return h ? parseProductDetail(h, link) : null;
          }));
          for (const product of results) {
            if (product) send({ type: "product", product });
          }
        }

        // Tell the frontend what the next page URL is (if any)
        if (nextPageUrl) send({ type: "next_page", url: nextPageUrl });

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
