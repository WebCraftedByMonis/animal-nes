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
  Referer: "https://vetpharmacy.ae/",
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

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

// ── Extract product links from Odoo /shop listing page ────────────────────────
function getProductLinks(html: string, origin: string): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const links: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const full = resolveUrl(origin, href);
    try {
      const u = new URL(full);
      if (u.origin !== origin) return;
      // Odoo product detail pages: /shop/SLUG (not /shop itself, not /shop/page/N, not /shop/cart etc.)
      if (!/^\/shop\/[^/]+\/?$/.test(u.pathname)) return;
      if (/^\/shop\/?$/.test(u.pathname)) return;
      if (/^\/shop\/page\//.test(u.pathname)) return;
      if (/\/(cart|checkout|wishlist|compare)\b/.test(u.pathname)) return;
      // Odoo product URLs always end with a numeric template ID: /shop/product-name-123
      // Brand/category links like /shop/brand-name don't have a trailing number — skip them
      if (!/\-\d+\/?$/.test(u.pathname)) return;
      const key = normalizeUrl(full);
      if (!seen.has(key)) { seen.add(key); links.push(key); }
    } catch { /* skip */ }
  });

  console.log(`[LINKS] Found ${links.length} product links`);
  return links;
}

// ── Find next page numbers from Odoo pagination ───────────────────────────────
function getPageCount(html: string): number {
  const $ = cheerio.load(html);
  let max = 1;

  // Odoo pager: <a href="/shop?page=N"> or data-page attribute
  $("a[href*='page='], a[data-page]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const dp   = $(el).attr("data-page") || "";
    const m = href.match(/[?&]page=(\d+)/) || dp.match(/^(\d+)$/);
    if (m) { const n = parseInt(m[1]); if (n > max) max = n; }
  });

  // Also check total product count in pager text like "1-20 / 402"
  const pagerText = clean($(".o_pager, .pager, [class*='pager']").text());
  const totalMatch = pagerText.match(/\/\s*(\d+)/);
  if (totalMatch) {
    // We'll derive pages after we know items per page
    const total = parseInt(totalMatch[1]);
    // Odoo default is 20 per page
    const pages = Math.ceil(total / 20);
    if (pages > max) max = pages;
  }

  console.log(`[PAGINATION] Max page: ${max}`);
  return max;
}

// ── Parse an Odoo product detail page ─────────────────────────────────────────
function parseProductPage(html: string, url: string): ExtractedProduct | null {
  console.log(`\n[PARSE] ${url}`);
  const $ = cheerio.load(html);
  const origin = new URL(url).origin;

  // ── Product name ──────────────────────────────────────────────────────────
  const productName =
    clean($("h1.o_product_name, h1.product_name, h1.product-name, .o_wsale_product_name h1, h1").first().text()) ||
    clean($('meta[property="og:title"]').attr("content") || "");
  if (!productName) { console.log(`[PARSE] ✗ No name`); return null; }
  console.log(`[PARSE] name: "${productName}"`);

  // ── Image ──────────────────────────────────────────────────────────────────
  // Odoo images: /web/image/product.product/ID/image_1024 or product.template/ID/image_512
  let imageUrl = "";
  const ogImage = $('meta[property="og:image"]').attr("content") || "";
  if (ogImage && /\/web\/image\//.test(ogImage)) {
    imageUrl = resolveUrl(origin, ogImage);
  }
  if (!imageUrl) {
    $([
      ".o_carousel_product .carousel-item img",
      ".o_product_image img",
      ".product-img img",
      ".product_detail_img img",
      "img[src*='/web/image/product']",
    ].join(", ")).each((_, el) => {
      if (imageUrl) return;
      const src = $(el).attr("src") || $(el).attr("data-src") || "";
      if (src && /\/web\/image\//.test(src)) imageUrl = resolveUrl(origin, src);
    });
  }
  // Fallback: first large image
  if (!imageUrl) {
    $("img").each((_, el) => {
      if (imageUrl) return;
      const src = $(el).attr("src") || "";
      if (src && /\/web\/image\//.test(src) && !/logo|header|icon/i.test(src))
        imageUrl = resolveUrl(origin, src);
    });
  }
  console.log(`[PARSE] image: "${imageUrl}"`);

  // ── Price ──────────────────────────────────────────────────────────────────
  let price = "";
  const priceSelectors = [
    ".oe_price .oe_currency_value",
    ".o_price_unit",
    ".product_price .oe_currency_value",
    ".js_add_cart_variants .oe_price",
    "[itemprop='price']",
    ".o_product_configurator_price .oe_currency_value",
  ];
  for (const sel of priceSelectors) {
    const raw = clean($(sel).first().text()).replace(/[^\d.]/g, "");
    if (raw && parseFloat(raw) > 0) { price = raw; break; }
  }
  console.log(`[PARSE] price: "${price}"`);

  // ── Categories from breadcrumb ─────────────────────────────────────────────
  const breadcrumb: string[] = [];
  $(".o_website_breadcrumb .breadcrumb-item, .breadcrumb .breadcrumb-item, nav.breadcrumb li").each((_, el) => {
    const t = clean($(el).text().replace(/›|»|\/|>/g, "").trim());
    if (t && t !== "Home" && t !== productName) breadcrumb.push(t);
  });
  // Remove last crumb (usually the product name itself)
  if (breadcrumb.length > 0 && breadcrumb[breadcrumb.length - 1] === productName)
    breadcrumb.pop();

  const category       = breadcrumb[0] || "";
  const subCategory    = breadcrumb[1] || "";
  const subsubCategory = breadcrumb[2] || "";

  // ── Description ───────────────────────────────────────────────────────────
  // Remove scripts/styles first
  $("script, style, nav, header, footer, noscript, .o_website_navbar, .o_header").remove();

  let description =
    clean($(".o_field_html, .o_product_description, .product_description, #product_details, .tab-pane.active").first().text()) ||
    clean($('meta[property="og:description"]').attr("content") || "");
  description = description.substring(0, 2000);

  // ── Generic name / brand (Odoo attribute) ─────────────────────────────────
  let genericName = "";
  $(".o_wsale_product_information tr, .o_product_attributes tr, table.o_product_attributes tr").each((_, el) => {
    const cells = $(el).find("td");
    const label = clean(cells.eq(0).text()).toLowerCase();
    if (/brand|generic|manufacturer|make/i.test(label))
      genericName = clean(cells.eq(1).text());
  });

  // ── Out of stock ──────────────────────────────────────────────────────────
  const outofstock =
    $(".o_not_enough_stock_warning, .out_of_stock, .o_out_of_stock, .o_add_cart_btn[disabled]").length > 0 ||
    /not available for sale|out of stock/i.test($(".o_product_availability, .o_add_cart_btn").first().text());

  // ── Variants / price ──────────────────────────────────────────────────────
  const variants: ExtractedVariant[] = [];
  $(".js_add_cart_variants select option, .o_product_variant_option").each((_, el) => {
    const label = clean($(el).text());
    if (label && !/select|choose|pick/i.test(label)) {
      variants.push({ packingVolume: label, customerPrice: price });
    }
  });
  if (!variants.length) variants.push({ packingVolume: "", customerPrice: price });

  console.log(`[PARSE] variants: ${variants.length}, outofstock: ${outofstock}`);

  return {
    productName: clean(productName),
    genericName,
    category, subCategory, subsubCategory,
    productType: "",
    description,
    dosage: "",
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
    console.log(`\n${"#".repeat(60)}\n[VETPHARMACY] url: ${url}\n${"#".repeat(60)}`);

    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    let parsed: URL;
    try { parsed = new URL(url); } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const origin = parsed.origin;

    // Keep all filter params (attrib, search, order, etc.) but strip `page` so we always start at 1
    const baseUrl = `${origin}${parsed.pathname}`.replace(/\/$/, "");
    const filterParams = new URLSearchParams(parsed.search);
    filterParams.delete("page");
    const filterStr = filterParams.toString(); // e.g. "search=&order=&attrib=13-2074"

    const buildPageUrl = (page: number) =>
      filterStr ? `${baseUrl}?${filterStr}&page=${page}` : `${baseUrl}?page=${page}`;

    console.log(`[VETPHARMACY] Base URL: ${baseUrl}, filters: ${filterStr || "(none)"}`);

    // ── Fetch page 1 ──────────────────────────────────────────────────────────
    const html1 = await fetchHtml(buildPageUrl(1));
    if (!html1) return NextResponse.json({ error: "Could not fetch the URL." }, { status: 400 });

    let allLinks = getProductLinks(html1, origin);
    const maxPage = getPageCount(html1);

    // ── Fetch remaining pages ──────────────────────────────────────────────────
    for (let page = 2; page <= maxPage; page++) {
      const pageHtml = await fetchHtml(buildPageUrl(page));
      if (!pageHtml) continue;
      const pageLinks = getProductLinks(pageHtml, origin);
      if (!pageLinks.length) { console.log(`[VETPHARMACY] No links on page ${page} — stopping`); break; }
      for (const l of pageLinks) if (!allLinks.includes(l)) allLinks.push(l);
      console.log(`[VETPHARMACY] Page ${page}: +${pageLinks.length} links, total: ${allLinks.length}`);
    }

    if (!allLinks.length) {
      // Try parsing as single product page
      const single = parseProductPage(html1, baseUrl);
      if (single) return NextResponse.json({ success: true, count: 1, totalLinks: 1, products: [single] });
      return NextResponse.json({ error: "No products found on this page." }, { status: 400 });
    }

    console.log(`\n[VETPHARMACY] Total: ${allLinks.length} products to fetch`);
    const products: ExtractedProduct[] = [];

    // ── Scrape each product page in batches of 3 ──────────────────────────────
    for (let i = 0; i < allLinks.length; i += 3) {
      const batch = allLinks.slice(i, i + 3);
      const results = await Promise.all(batch.map(async link => {
        const h = await fetchHtml(link);
        return h ? parseProductPage(h, link) : null;
      }));
      results.forEach(r => r && products.push(r));
      console.log(`[VETPHARMACY] Batch ${Math.floor(i / 3) + 1}, total: ${products.length}`);
    }

    console.log(`[VETPHARMACY] ✓ Done — ${products.length} products`);
    return NextResponse.json({ success: true, count: products.length, totalLinks: allLinks.length, products });

  } catch (e: any) {
    console.log(`[VETPHARMACY] ✗ Fatal: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message || "Scraping failed" }, { status: 500 });
  }
}
