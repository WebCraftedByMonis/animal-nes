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

// ── Decode BigCommerce BODL Base64 JSON from listing page ─────────────────────
interface BodlProduct {
  product_id: string;
  product_name: string;
  purchase_price: number;
  sale_price: number | null;
  brand_name: string;
  category_names: string[];
  quantity: number;
}

function decodeBodl(html: string): BodlProduct[] {
  // window.bodl_v1 = JSON.parse(atob("BASE64")) or similar
  const match = html.match(/JSON\.parse\s*\(\s*(?:atob|decodeBase64)\s*\(\s*["']([A-Za-z0-9+/=]+)["']\s*\)\s*\)/);
  if (!match) return [];
  try {
    const decoded = Buffer.from(match[1], "base64").toString("utf-8");
    const obj = JSON.parse(decoded);
    // BODL structure: { product_impression: [...] } or { page: { product_impression: [...] } }
    const list: any[] =
      obj?.product_impression ||
      obj?.page?.product_impression ||
      obj?.ecommerce?.impressions ||
      [];
    return list;
  } catch { return []; }
}

// ── Collect product links + BODL data from listing pages ─────────────────────
async function collectListingData(startUrl: string, origin: string): Promise<{ links: string[]; bodlMap: Map<string, BodlProduct> }> {
  const links: string[] = [];
  const seen = new Set<string>();
  const bodlMap = new Map<string, BodlProduct>();
  let pageNum = 1;

  // Non-product paths to exclude
  const excluded = /\/(cart|account|login|wishlist|search|blog|contact|about|category|brands|sitemap)/i;

  while (true) {
    const pageUrl = pageNum === 1 ? startUrl : `${startUrl.replace(/\/$/, "")}/?page=${pageNum}`;
    const html = await fetchHtml(pageUrl);
    if (!html) break;

    const $ = cheerio.load(html);

    // Decode BODL for price/brand/category data
    const bodlItems = decodeBodl(html);
    for (const item of bodlItems) {
      if (item.product_name) bodlMap.set(clean(item.product_name).toLowerCase(), item);
    }

    // Collect product links from cards
    let found = 0;
    $("li.product a[href], article.product a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (!href || excluded.test(href)) return;
      const abs = resolveUrl(origin, href);
      // Must be same origin, not a category/filter URL (no query params for filters)
      if (!abs.startsWith(origin)) return;
      const path = new URL(abs).pathname;
      // Skip if it's clearly a category (contains the listing path)
      if (path === new URL(startUrl).pathname) return;
      if (!seen.has(abs)) {
        seen.add(abs);
        links.push(abs);
        found++;
      }
    });

    console.log(`[LISTING] page=${pageNum}, found=${found} links, total=${links.length}`);

    // Check for next page
    const hasNext = $("a.pagination-item--next, a[data-page], li.pagination-item--next a").length > 0 ||
      $("a").filter((_, el) => /page=\d+/.test($(el).attr("href") || "")).length > 0;

    // Stop if no new products found or no next page indicator
    if (found === 0 || !hasNext) break;
    pageNum++;
    if (pageNum > 20) break; // safety limit
  }

  return { links, bodlMap };
}

// ── Parse BigCommerce product detail page ─────────────────────────────────────
function parseDetailPage(html: string, url: string, bodlItem?: BodlProduct): ExtractedProduct | null {
  const $ = cheerio.load(html);
  const origin = new URL(url).origin;

  // Product name
  const name = clean(
    $(".productView-title, h1.product-title, h1[itemprop='name'], [data-product-title]").first().text() ||
    $('meta[property="og:title"]').attr("content") || ""
  );
  if (!name) return null;

  // Image — BigCommerce CDN pattern
  const imgCandidates = [
    $(".productView-image img, .productView-img-container img").first().attr("data-zoom-image"),
    $(".productView-image img, .productView-img-container img").first().attr("src"),
    $('meta[property="og:image"]').attr("content"),
  ];
  const rawImage = imgCandidates.find(c => c && isImageUrl(c)) || "";
  // Upgrade to 1280px if possible
  const imageUrl = rawImage
    ? rawImage.replace(/\/\d+x\d+\//, "/1280x1280/")
    : "";

  // Price — try window.BCData JSON first (most reliable), then DOM
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
  if (!price) {
    // DOM fallbacks
    price = clean($("span.price.sale-price-cal, span.sale-price-cal, .price.sale-price-cal").first().text()).replace(/[^\d.]/g, "");
  }
  if (!price) {
    price = clean($("span.price, .price").first().text()).replace(/[^\d.]/g, "");
  }
  // Also try BODL listing data
  if (!price) {
    const bodlPrice = bodlItem?.sale_price ?? bodlItem?.purchase_price;
    if (bodlPrice != null) price = String(Math.round(bodlPrice));
  }

  // Variants — BigCommerce attribute selects or radio swatches
  const variants: ExtractedVariant[] = [];
  $("select[data-product-attribute] option, select[name*='attribute'] option, select[name*='modifier'] option").each((_, el) => {
    const val = clean($(el).text());
    const dataPrice = $(el).attr("data-calculated-price") || "";
    if (val && !/choose|select|pick/i.test(val)) {
      variants.push({
        packingVolume: val,
        customerPrice: dataPrice ? String(Math.round(parseFloat(dataPrice))) : price,
      });
    }
  });

  if (!variants.length) {
    $("input[type='radio'][data-product-attribute], input[type='radio'][name*='attribute']").each((_, el) => {
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
    $("#tab-description").text() ||
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

  // Categories + brand from BODL
  const cats = bodlItem?.category_names || [];
  const genericName = bodlItem?.brand_name
    ? clean(bodlItem.brand_name)
    : clean($('[data-product-brand], .productView-brand a').first().text());

  const outofstock = bodlItem ? bodlItem.quantity === 0 : $(".out-of-stock, .stock-unavailable").length > 0;

  console.log(`[DETAIL] "${name}" img=${imageUrl ? "✓" : "✗"} variants=${variants.length} desc=${description.length}c`);

  return {
    productName: name,
    genericName,
    category:       cats[0] || "",
    subCategory:    cats[1] || "",
    subsubCategory: cats[2] || "",
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
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    let parsed: URL;
    try { parsed = new URL(url); } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const origin = parsed.origin;
    console.log(`[PETWORLDUAE] origin=${origin}, url=${url}`);

    // Collect product links + BODL data from listing pages
    const { links, bodlMap } = await collectListingData(url, origin);
    console.log(`[PETWORLDUAE] ${links.length} product links, ${bodlMap.size} BODL entries`);

    if (!links.length)
      return NextResponse.json({ error: "No products found. Check the URL." }, { status: 400 });

    // Parse detail pages in batches of 3
    const products: ExtractedProduct[] = [];
    for (let i = 0; i < links.length; i += 3) {
      const batch = links.slice(i, i + 3);
      const results = await Promise.all(batch.map(async (link) => {
        const h = await fetchHtml(link);
        if (!h) return null;
        // Try to match BODL data by product name
        const bodlItem = [...bodlMap.values()].find(b =>
          link.includes(b.product_name.toLowerCase().replace(/\s+/g, "-").substring(0, 20))
        );
        return parseDetailPage(h, link, bodlItem);
      }));
      results.forEach(r => { if (r) products.push(r); });
      console.log(`[PETWORLDUAE] batch ${Math.floor(i / 3) + 1}, total: ${products.length}`);
    }

    if (!products.length)
      return NextResponse.json({ error: "Products found but could not be parsed." }, { status: 400 });

    return NextResponse.json({ success: true, count: products.length, totalLinks: products.length, products });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Scraping failed" }, { status: 500 });
  }
}
