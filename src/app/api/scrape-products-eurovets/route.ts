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
  Referer: "https://www.eurovets.ae/",
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
  console.log(`\n[FETCH] → ${url}`);
  try {
    const res = await axios.get(url, {
      headers: HEADERS,
      timeout: 20000,
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

// ── Parse product cards directly from a listing page ─────────────────────────
// Eurovets product pages require login — all data must come from listing cards.
function parseListingPage(html: string, origin: string, fallbackCategory: string): ExtractedProduct[] {
  const $ = cheerio.load(html);
  const products: ExtractedProduct[] = [];

  // Breadcrumb category from listing page itself
  const breadcrumb: string[] = [];
  $(".o_website_breadcrumb .breadcrumb-item, .breadcrumb .breadcrumb-item").each((_, el) => {
    const t = clean($(el).text().replace(/›|»|>|\//g, ""));
    if (t && t.toLowerCase() !== "home") breadcrumb.push(t);
  });
  const category       = breadcrumb[0] || fallbackCategory;
  const subCategory    = breadcrumb[1] || "";
  const subsubCategory = breadcrumb[2] || "";

  // Each product is in a <td class="oe_product"> cell
  $("td.oe_product, .oe_product_cart").each((_, card) => {
    const $card = $(card);

    // ── Name ─────────────────────────────────────────────────────────────────
    // <a itemprop="name" content="Iramine 8mg tabs - 100tabs">Iramine 8mg tabs - 100tabs</a>
    const nameEl = $card.find("a[itemprop='name']").first();
    const productName = clean(nameEl.attr("content") || nameEl.text());
    if (!productName) return; // skip empty cards

    // ── Product link ──────────────────────────────────────────────────────────
    const linkHref = $card.find("a.oe_product_image_link, a[itemprop='url'], a[itemprop='name']").first().attr("href") || "";
    const productLink = linkHref ? resolveUrl(origin, linkHref.split("?")[0]) : "";

    // ── Image ─────────────────────────────────────────────────────────────────
    // <img src="/web/image/product.template/40220/image_512/..." itemprop="image">
    const imgSrc = $card.find("img[itemprop='image'], .oe_product_image img").first().attr("src") || "";
    // Upgrade from image_512 to image_1024 for better quality
    const imageUrl = imgSrc
      ? resolveUrl(origin, imgSrc.replace("image_512", "image_1024"))
      : "";

    // ── Sub-description (short desc sometimes shown in grid) ──────────────────
    const description = clean($card.find(".oe_subdescription").text());

    // ── Stock status ──────────────────────────────────────────────────────────
    const stockText = clean($card.find("h5[itemprop='stock'], .o_wsale_product_availability").text()).toLowerCase();
    const outofstock = /out.?of.?stock|unavailable|not available/i.test(stockText);

    console.log(`[CARD] "${productName}" | img: ${imgSrc ? "✓" : "✗"} | link: ${productLink}`);

    products.push({
      productName,
      genericName: "",
      category,
      subCategory,
      subsubCategory,
      productType: "",
      description,
      dosage: "",
      productLink,
      imageUrl,
      outofstock,
      variants: [{ packingVolume: "", customerPrice: "" }],
    });
  });

  console.log(`[LISTING] Parsed ${products.length} products from page`);
  return products;
}

// ── Detect total pages from Odoo pager ────────────────────────────────────────
function detectTotalPages(html: string, perPage: number): number {
  const $ = cheerio.load(html);

  // data-ppg on the table tells us products-per-group (page size)
  const ppg = parseInt($("table[data-ppg]").attr("data-ppg") || String(perPage));
  if (ppg > 0) perPage = ppg;

  // Look for page= links first
  let maxPage = 1;
  $("a[href*='page=']").each((_, el) => {
    const m = ($(el).attr("href") || "").match(/[?&]page=(\d+)/);
    if (m) { const n = parseInt(m[1]); if (n > maxPage) maxPage = n; }
  });
  if (maxPage > 1) { console.log(`[PAGINATION] page= style, maxPage=${maxPage}`); return maxPage; }

  // Look for offset= links
  let maxOffset = 0;
  $("a[href*='offset='], [data-pager-offset]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const dp   = $(el).attr("data-pager-offset") || "";
    const m = href.match(/[?&]offset=(\d+)/) || dp.match(/^(\d+)$/);
    if (m) { const n = parseInt(m[1]); if (n > maxOffset) maxOffset = n; }
  });
  if (maxOffset > 0) {
    const pages = Math.ceil((maxOffset + perPage) / perPage);
    console.log(`[PAGINATION] offset= style, maxOffset=${maxOffset}, pages=${pages}`);
    return pages;
  }

  // Parse "1-20 / 402" or "X - Y / Total" from pager text
  const pagerText = $(".o_pager, .pager, [class*='pager'], .pagination").text();
  const m = pagerText.match(/[\d,]+\s*[-–]\s*[\d,]+\s*\/\s*([\d,]+)/) ||
            pagerText.match(/of\s+([\d,]+)/i);
  if (m) {
    const total = parseInt(m[1].replace(/,/g, ""));
    const pages = Math.ceil(total / perPage);
    console.log(`[PAGINATION] derived from total=${total}, perPage=${perPage}, pages=${pages}`);
    return pages;
  }

  console.log(`[PAGINATION] single page`);
  return 1;
}

// ── POST handler ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    console.log(`\n${"#".repeat(60)}\n[EUROVETS] url: ${url}\n${"#".repeat(60)}`);

    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    let parsed: URL;
    try { parsed = new URL(url); } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const origin = parsed.origin;
    const baseUrl = `${origin}${parsed.pathname}`.replace(/\/$/, "");

    // Preserve all filter params, strip pagination params
    const filterParams = new URLSearchParams(parsed.search);
    filterParams.delete("page");
    filterParams.delete("offset");
    const filterStr = filterParams.toString();

    // Derive a fallback category name from the URL path
    // e.g. /shop/category/new-products-205 → "New Products"
    const pathParts = parsed.pathname.replace(/\/$/, "").split("/");
    const lastPart = pathParts[pathParts.length - 1] || "";
    const fallbackCategory = lastPart
      .replace(/-\d+$/, "")           // strip trailing ID
      .replace(/-/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());

    const buildUrl = (page: number) => {
      const p = new URLSearchParams(filterStr);
      p.set("page", String(page));
      return `${baseUrl}?${p.toString()}`;
    };

    console.log(`[EUROVETS] Base: ${baseUrl}, filters: ${filterStr || "(none)"}, fallbackCat: "${fallbackCategory}"`);

    // ── Fetch page 1 ──────────────────────────────────────────────────────────
    const firstUrl = filterStr ? `${baseUrl}?${filterStr}` : baseUrl;
    const html1 = await fetchHtml(firstUrl);
    if (!html1) return NextResponse.json({ error: "Could not fetch the URL." }, { status: 400 });

    const allProducts: ExtractedProduct[] = parseListingPage(html1, origin, fallbackCategory);
    const totalPages = detectTotalPages(html1, 20);

    // ── Fetch remaining pages ──────────────────────────────────────────────────
    for (let page = 2; page <= totalPages; page++) {
      const pageHtml = await fetchHtml(buildUrl(page));
      if (!pageHtml) continue;
      const pageProducts = parseListingPage(pageHtml, origin, fallbackCategory);
      if (!pageProducts.length) { console.log(`[EUROVETS] No products on page ${page} — stopping`); break; }
      allProducts.push(...pageProducts);
      console.log(`[EUROVETS] Page ${page}: +${pageProducts.length}, total: ${allProducts.length}`);
    }

    if (!allProducts.length)
      return NextResponse.json({ error: "No products found on this page." }, { status: 400 });

    console.log(`[EUROVETS] ✓ Done — ${allProducts.length} products`);
    return NextResponse.json({
      success: true,
      count: allProducts.length,
      totalLinks: allProducts.length,
      products: allProducts,
    });

  } catch (e: any) {
    console.log(`[EUROVETS] ✗ Fatal: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message || "Scraping failed" }, { status: 500 });
  }
}
