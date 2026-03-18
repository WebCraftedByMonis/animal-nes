import { NextRequest, NextResponse } from "next/server";
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
  console.log(`\n[FETCH] → ${url}`);
  try {
    const res = await axios.get(url, {
      headers: HEADERS,
      timeout: 25000,
      httpsAgent,
      maxRedirects: 5,
      responseType: "text",
      validateStatus: (s) => s < 500,
    });
    console.log(`[FETCH] ← ${res.status}, ${String(res.data).length} chars`);
    if (res.status >= 400) return null;
    return typeof res.data === "string" ? res.data : String(res.data);
  } catch (e: any) {
    console.log(`[FETCH] ✗ ${e.message}`);
    return null;
  }
}

// ── Extract product links from a WooCommerce listing/category page ─────────────
function getProductLinks(html: string, origin: string): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const links: string[] = [];

  $([
    "li.product a.woocommerce-loop-product__link",
    "li.product a",
    ".products .product a",
    "a.woocommerce-loop-product__link",
    ".woocommerce-loop-product__link",
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

  console.log(`[LINKS] Found ${links.length} product links`);
  return links;
}

// ── Extract all paginated page URLs ───────────────────────────────────────────
function getPaginationUrls(html: string, origin: string, baseUrl: string): string[] {
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

  // If no explicit pagination links found, try to infer from "next" link
  if (!pages.length) {
    const next = $("a.next.page-numbers, a[rel='next']").attr("href");
    if (next) {
      const full = resolveUrl(origin, next);
      if (!seen.has(full)) pages.push(full);
    }
  }

  console.log(`[PAGINATION] Found ${pages.length} additional pages`);
  return pages;
}

// ── Parse a WooCommerce product detail page ────────────────────────────────────
function parseProductDetail(html: string, url: string): ExtractedProduct | null {
  console.log(`\n[DETAIL] ${url}`);
  const $raw = cheerio.load(html);
  const origin = new URL(url).origin;

  // ── Product name ──────────────────────────────────────────────────────────
  const productName =
    clean($raw("h1.product_title, h1.product-title, h1.entry-title, h1").first().text()) ||
    clean($raw('meta[property="og:title"]').attr("content") || "");
  if (!productName) { console.log(`[DETAIL] ✗ No name`); return null; }
  console.log(`[DETAIL] name: "${productName}"`);

  // ── Image — prioritise data-large_image for full-size ────────────────────
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
  console.log(`[DETAIL] image: "${imageUrl}"`);

  // ── Price ─────────────────────────────────────────────────────────────────
  let price = "";
  for (const sel of [
    ".woocommerce-Price-amount bdi",
    ".woocommerce-Price-amount",
    ".price ins .woocommerce-Price-amount",
    ".price .woocommerce-Price-amount",
    "[itemprop='price']",
    ".price",
  ]) {
    const raw = clean($raw(sel).first().text()).replace(/[^\d.]/g, "");
    if (raw && parseFloat(raw) > 0) { price = raw; break; }
  }
  console.log(`[DETAIL] price: "${price}"`);

  // ── Categories from breadcrumb ─────────────────────────────────────────────
  const breadcrumb: string[] = [];
  $raw(".woocommerce-breadcrumb, .breadcrumb, nav.woocommerce-breadcrumb")
    .find("a, span").each((_, el) => {
      const t = clean($raw(el).text());
      if (t && t !== "Home" && t !== productName) breadcrumb.push(t);
    });
  const uniqueBread = [...new Set(breadcrumb)];
  const category       = uniqueBread[0] || "";
  const subCategory    = uniqueBread[1] || "";
  const subsubCategory = uniqueBread[2] || "";

  // ── Description — from the "Description" tab ─────────────────────────────
  // WooCommerce injects description in #tab-description / .woocommerce-Tabs-panel--description
  const $clean = cheerio.load(html);
  $clean("script, style, nav, header, footer, noscript, .woocommerce-tabs .tabs").remove();

  let description =
    clean($clean("#tab-description").text()) ||
    clean($clean(".woocommerce-Tabs-panel--description").text()) ||
    clean($clean(".woocommerce-product-details__short-description").text()) ||
    clean($clean('meta[property="og:description"]').attr("content") || "");
  description = description.substring(0, 3000);
  console.log(`[DETAIL] description: ${description.length} chars`);

  // ── Dosage / directions from other tabs ───────────────────────────────────
  let dosage = "";
  $clean(".woocommerce-Tabs-panel, .tab-pane, .wc-tab").each((_, el) => {
    const heading = clean($clean(el).find("h2, h3, h4, .panel-title").first().text());
    if (/direction|dosage|usage|how to use|feeding|instruction|administration/i.test(heading)) {
      dosage = clean($clean(el).text().replace(heading, "")).substring(0, 1000);
      return false;
    }
  });

  // ── Generic name / brand ──────────────────────────────────────────────────
  const genericName = clean(
    $raw(".product_meta .brand a, .product_meta [class*='brand'] a").first().text() ||
    $raw('meta[property="product:brand"]').attr("content") || ""
  );

  // ── Variants from WooCommerce variation JSON ──────────────────────────────
  const variants: ExtractedVariant[] = [];
  const variationAttr = $raw("form.variations_form").attr("data-product_variations") || "";
  if (variationAttr && variationAttr !== "false") {
    try {
      const variations = JSON.parse(variationAttr);
      if (Array.isArray(variations) && variations.length > 0) {
        for (const v of variations) {
          const label = Object.values(v.attributes || {})
            .filter((val: any) => val)
            .join(" / ");
          const vPrice = v.display_price != null ? String(Math.round(v.display_price)) : price;
          if (label || vPrice) variants.push({ packingVolume: label, customerPrice: vPrice });
        }
        console.log(`[DETAIL] ${variants.length} variants from JSON`);
      }
    } catch { /* skip */ }
  }

  // Fallback: parse <select> options
  if (!variants.length) {
    $raw(".variations select option, select[name*='attribute'] option").each((_, el) => {
      const val = clean($raw(el).text());
      if (val && !/choose|select/i.test(val))
        variants.push({ packingVolume: val, customerPrice: price });
    });
  }

  if (!variants.length) variants.push({ packingVolume: "", customerPrice: price });

  // ── Out of stock ──────────────────────────────────────────────────────────
  const outofstock =
    $raw(".out-of-stock, .stock.out-of-stock, .woocommerce-out-of-stock").length > 0 ||
    /out.?of.?stock/i.test($raw(".stock").first().text());

  console.log(`[DETAIL] variants: ${variants.length}, outofstock: ${outofstock}`);

  return {
    productName: clean(productName),
    genericName,
    category, subCategory, subsubCategory,
    productType: "",
    description,
    dosage,
    productLink: url,
    imageUrl,
    outofstock,
    variants,
  };
}

// ── POST handler ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    console.log(`\n${"#".repeat(60)}\n[ONLINEVETPHARMACY] url: ${url}\n${"#".repeat(60)}`);

    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    let parsed: URL;
    try { parsed = new URL(url); } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const origin = parsed.origin;
    const baseUrl = toBaseUrl(url);
    console.log(`[ONLINEVETPHARMACY] Base URL: ${baseUrl}`);

    // ── Fetch first page ──────────────────────────────────────────────────────
    const html1 = await fetchHtml(baseUrl);
    if (!html1) return NextResponse.json({ error: "Could not fetch the URL." }, { status: 400 });

    let allLinks = getProductLinks(html1, origin);

    // ── Discover and fetch all pagination pages ───────────────────────────────
    const paginationUrls = getPaginationUrls(html1, origin, baseUrl);
    const visitedPages = new Set<string>([normalizeUrl(baseUrl)]);

    for (const pageUrl of paginationUrls) {
      const key = normalizeUrl(pageUrl);
      if (visitedPages.has(key)) continue;
      visitedPages.add(key);

      const pageHtml = await fetchHtml(pageUrl);
      if (!pageHtml) continue;

      const pageLinks = getProductLinks(pageHtml, origin);
      for (const l of pageLinks) if (!allLinks.includes(l)) allLinks.push(l);
      console.log(`[ONLINEVETPHARMACY] Page ${pageUrl}: +${pageLinks.length}, total: ${allLinks.length}`);

      // Discover further pages from this page (handles cases where only adjacent pages are linked)
      const furtherPages = getPaginationUrls(pageHtml, origin, baseUrl);
      for (const fp of furtherPages) {
        if (!visitedPages.has(normalizeUrl(fp)) && !paginationUrls.includes(fp)) {
          paginationUrls.push(fp);
        }
      }
    }

    if (!allLinks.length) {
      // Maybe it's a single product URL
      const single = parseProductDetail(html1, baseUrl);
      if (single) return NextResponse.json({ success: true, count: 1, totalLinks: 1, products: [single] });
      return NextResponse.json({ error: "No products found on this page." }, { status: 400 });
    }

    console.log(`\n[ONLINEVETPHARMACY] Total: ${allLinks.length} product links`);
    const products: ExtractedProduct[] = [];

    // ── Scrape detail pages in batches of 3 ──────────────────────────────────
    for (let i = 0; i < allLinks.length; i += 3) {
      const batch = allLinks.slice(i, i + 3);
      const results = await Promise.all(batch.map(async link => {
        const h = await fetchHtml(link);
        return h ? parseProductDetail(h, link) : null;
      }));
      results.forEach(r => r && products.push(r));
      console.log(`[ONLINEVETPHARMACY] Batch ${Math.floor(i / 3) + 1}, total: ${products.length}`);
    }

    console.log(`[ONLINEVETPHARMACY] ✓ Done — ${products.length} products`);
    return NextResponse.json({
      success: true,
      count: products.length,
      totalLinks: allLinks.length,
      products,
    });

  } catch (e: any) {
    console.log(`[ONLINEVETPHARMACY] ✗ Fatal: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message || "Scraping failed" }, { status: 500 });
  }
}
