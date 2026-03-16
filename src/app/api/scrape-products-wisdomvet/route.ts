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
  Referer: "https://wisdomvet.ae/",
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

async function fetchJson(url: string): Promise<any> {
  console.log(`\n[FETCH-JSON] → ${url}`);
  try {
    const res = await axios.get(url, {
      headers: { ...HEADERS, Accept: "application/json" },
      timeout: 20000,
      httpsAgent,
      validateStatus: (s) => s < 500,
    });
    if (res.status >= 400) { console.log(`[FETCH-JSON] ✗ ${res.status}`); return null; }
    console.log(`[FETCH-JSON] ✓`);
    return res.data;
  } catch (e: any) {
    console.log(`[FETCH-JSON] ✗ ${e.message}`);
    return null;
  }
}

// ── WooCommerce Store API — fetch all products (no category filter) ────────────
async function tryWcStoreApi(origin: string, categorySlug?: string): Promise<ExtractedProduct[] | null> {
  console.log(`\n[WC-API] Trying WooCommerce Store API...`);
  const products: ExtractedProduct[] = [];
  let page = 1;

  while (true) {
    const catParam = categorySlug ? `&category=${encodeURIComponent(categorySlug)}` : "";
    const apiUrl = `${origin}/wp-json/wc/store/v1/products?per_page=100&page=${page}${catParam}`;
    const data = await fetchJson(apiUrl);

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log(`[WC-API] No data on page ${page} — stopping`);
      break;
    }

    console.log(`[WC-API] Page ${page}: ${data.length} products`);

    for (const item of data) {
      const name = clean(item.name || "");
      if (!name) continue;

      const imgObj = item.images?.[0] || {};
      const imageUrl = imgObj.src || imgObj.thumbnail || imgObj.url || "";

      const cats: string[] = (item.categories || []).map((c: any) => clean(c.name)).filter(Boolean);
      const category       = cats[0] || "";
      const subCategory    = cats[1] || "";
      const subsubCategory = cats[2] || "";

      const priceObj  = item.prices || {};
      const rawPrice  = priceObj.price || priceObj.regular_price || "";
      const decimals  = priceObj.currency_minor_unit ?? 2;
      const price     = rawPrice ? (parseInt(rawPrice) / Math.pow(10, decimals)).toFixed(2) : "";

      const rawDesc   = item.short_description || item.description || "";
      const description = clean(cheerio.load(rawDesc).text()).substring(0, 2000);

      const variants: ExtractedVariant[] = [];
      if (item.variations?.length) {
        for (const v of item.variations) {
          variants.push({
            packingVolume: (v.attributes || []).map((a: any) => a.value).join(" / "),
            customerPrice: price,
          });
        }
      }
      if (!variants.length) variants.push({ packingVolume: "", customerPrice: price });

      products.push({
        productName: name,
        genericName: "",
        category, subCategory, subsubCategory,
        productType: "",
        description,
        dosage: "",
        productLink: item.permalink || "",
        imageUrl: isImageUrl(imageUrl) ? imageUrl : "",
        outofstock: item.stock_status === "outofstock",
        variants,
      });
    }

    if (data.length < 100) break;
    page++;
  }

  if (!products.length) { console.log(`[WC-API] No products found`); return null; }
  console.log(`[WC-API] ✓ Got ${products.length} products`);
  return products;
}

// ── HTML: extract product links from a WooCommerce listing page ───────────────
function getProductLinks(html: string, origin: string): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const links: string[] = [];

  // WooCommerce blocks grid + classic loop
  $([
    ".wc-block-grid__product a",
    "li.product a",
    ".products .product a",
    "a.woocommerce-loop-product__link",
  ].join(", ")).each((_, el) => {
    const href = $(el).attr("href") || "";
    const full = resolveUrl(origin, href);
    try {
      const u = new URL(full);
      if (u.origin !== origin) return;
      // wisdomvet uses /products/SLUG/ pattern
      if (!/\/products\/[^/]+/.test(u.pathname)) return;
      if (/\/products\/?$/.test(u.pathname)) return; // skip listing page itself
      if (/\/product-category\/|\/product-tag\//i.test(u.pathname)) return;
      const key = normalizeUrl(full);
      if (!seen.has(key)) { seen.add(key); links.push(key); }
    } catch { /* skip */ }
  });

  console.log(`[LINKS] Found ${links.length} product links`);
  return links;
}

// ── HTML: pagination links ─────────────────────────────────────────────────────
function getPaginationLinks(html: string, origin: string): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const pages: string[] = [];

  // Astra theme uses .ast-pagination, WC uses .woocommerce-pagination
  $(".ast-pagination a.page-numbers, .woocommerce-pagination a.page-numbers, a.page-numbers").each((_, el) => {
    const href = $(el).attr("href") || "";
    const full = resolveUrl(origin, href);
    try {
      const u = new URL(full);
      if (u.origin !== origin) return;
      if (/\/page\/\d+\/?$/.test(u.pathname)) {
        const key = normalizeUrl(full);
        if (!seen.has(key)) { seen.add(key); pages.push(key); }
      }
    } catch { /* skip */ }
  });

  console.log(`[PAGINATION] Found ${pages.length} pages:`, pages);
  return pages;
}

// ── Parse a WooCommerce product detail page ────────────────────────────────────
function parseProductCheerio(html: string, url: string): ExtractedProduct | null {
  console.log(`\n[CHEERIO] Parsing: ${url}`);
  const $raw = cheerio.load(html);
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, noscript").remove();

  const origin = new URL(url).origin;

  // ── JSON-LD ────────────────────────────────────────────────────────────────
  let name = "", price = "", availability = "", imageUrl = "", ldDesc = "";
  let breadcrumb: string[] = [];

  $raw('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($raw(el).html() || "{}");
      (Array.isArray(json) ? json : [json]).forEach((item: any) => {
        const graph = item["@graph"] || [item];
        for (const node of graph) {
          if (node["@type"] === "BreadcrumbList") {
            breadcrumb = (node.itemListElement || [])
              .sort((a: any, b: any) => a.position - b.position)
              .map((c: any) => c.name as string)
              .filter((n: string) => n && n !== "Home");
            if (breadcrumb.length > 1) breadcrumb = breadcrumb.slice(0, -1);
          }
          if (node["@type"] === "Product") {
            if (!name) name = node.name || "";
            const img = node.image;
            if (!imageUrl) imageUrl = Array.isArray(img) ? img[0] : img || "";
            const o = Array.isArray(node.offers) ? node.offers[0] : node.offers || {};
            if (!price && o.price != null) price = String(o.price);
            if (!availability) availability = (o.availability || "").replace("https://schema.org/", "");
            if (!ldDesc && node.description && !/^\d+$/.test(node.description.trim()))
              ldDesc = node.description;
          }
        }
      });
    } catch (e: any) { console.log(`[CHEERIO] JSON-LD err: ${e.message}`); }
  });

  // ── Product name ──────────────────────────────────────────────────────────
  const productName = name ||
    clean($(".product_title, h1.entry-title, h1.product-title, h1").first().text()) ||
    clean($('meta[property="og:title"]').attr("content") || "");
  if (!productName) { console.log(`[CHEERIO] ✗ No product name`); return null; }
  console.log(`[CHEERIO] productName: "${productName}"`);

  // ── Image — check multiple attributes for lazy-loaded images ─────────────
  const galleryImg = $raw(".woocommerce-product-gallery img, .wp-post-image, .woocommerce-product-gallery__image img").first();
  const candidates = [
    imageUrl,
    galleryImg.attr("data-large_image"),
    galleryImg.attr("data-src"),
    galleryImg.attr("data-lazy-src"),
    galleryImg.closest("a").attr("href"),
    $raw('meta[property="og:image"]').attr("content"),
    $raw('meta[name="twitter:image"]').attr("content"),
    galleryImg.attr("src"),
  ];
  const rawImage = candidates.find(c => c && isImageUrl(c)) || "";
  const image = resolveUrl(origin, rawImage);
  console.log(`[CHEERIO] image: "${image}"`);

  // ── Categories ────────────────────────────────────────────────────────────
  if (!breadcrumb.length) {
    $(".woocommerce-breadcrumb, .breadcrumb, nav[aria-label*='breadcrumb']")
      .find("a, span, li").each((_, el) => {
        const t = clean($(el).text());
        if (t && t !== "Home" && t !== productName) breadcrumb.push(t);
      });
    if (breadcrumb.length) breadcrumb = [...new Set(breadcrumb)].slice(0, -1).filter(Boolean);
  }
  const category       = breadcrumb[0] || "";
  const subCategory    = breadcrumb[1] || "";
  const subsubCategory = breadcrumb[2] || "";

  // ── Price ─────────────────────────────────────────────────────────────────
  if (!price) {
    const sel = [
      ".woocommerce-Price-amount bdi",
      ".woocommerce-Price-amount",
      ".price ins .amount",
      ".price .amount",
      "[itemprop='price']",
    ];
    for (const s of sel) {
      const raw = clean($(s).first().text()).replace(/[^\d.]/g, "");
      if (raw && parseFloat(raw) > 0) { price = raw; break; }
    }
  }
  console.log(`[CHEERIO] price: "${price}"`);

  // ── Description ───────────────────────────────────────────────────────────
  let description = ldDesc;
  if (!description) {
    description = (
      clean($(".woocommerce-product-details__short-description").text()) ||
      clean($(".woocommerce-Tabs-panel--description").text()) ||
      clean($("#tab-description").text())
    ).substring(0, 2000);
  }

  // ── Dosage / Usage ────────────────────────────────────────────────────────
  let dosage = "";
  $(".wc-tab, .woocommerce-Tabs-panel, .tab-content, .accordion-item, .card").each((_, el) => {
    const h = clean($(el).find("h2,h3,h4,.tab-title,.accordion-header,.card-header").first().text());
    if (/direction|dosage|usage|how to use|feeding|instruction/i.test(h)) {
      dosage = clean($(el).text().replace(h, "")).substring(0, 1000);
      return false;
    }
  });

  // ── Generic name / brand ──────────────────────────────────────────────────
  const genericName =
    clean($(".product_meta .brand a, .woocommerce-product-attributes [data-slug='brand'] td, [class*='brand'] td").first().text()) ||
    clean($raw('meta[property="product:brand"]').attr("content") || "");

  // ── Variants ──────────────────────────────────────────────────────────────
  const variants: ExtractedVariant[] = [];

  // Try inline variation JSON from WooCommerce
  $raw("script").each((_, el) => {
    const content = $raw(el).html() || "";
    if (content.includes('"variations"')) {
      try {
        const m = content.match(/var\s+\w+\s*=\s*(\{.*?"variations".*?\})\s*;/s) ||
                  content.match(/jQuery\.parseJSON\('(\{.*?"variations".*?\})'\)/s);
        if (m) {
          const data = JSON.parse(m[1]);
          if (Array.isArray(data.variations)) {
            for (const v of data.variations) {
              const label = Object.values(v.attributes || {}).join(" / ");
              const vPrice = v.display_price ? String(v.display_price) : price;
              if (vPrice) variants.push({ packingVolume: label, customerPrice: vPrice });
            }
            if (variants.length) return false;
          }
        }
      } catch { /* skip */ }
    }
  });

  if (!variants.length && price) {
    variants.push({ packingVolume: "", customerPrice: price });
  }

  console.log(`[CHEERIO] variants: ${variants.length}`);

  return {
    productName: clean(productName),
    genericName,
    category, subCategory, subsubCategory,
    productType: "",
    description,
    dosage,
    productLink: url,
    imageUrl: image,
    outofstock: /OutOfStock|out.?of.?stock/i.test(availability) ||
      $(".out-of-stock, .stock.out-of-stock").length > 0,
    variants,
  };
}

// ── POST handler ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    console.log(`\n${"#".repeat(60)}\n[WISDOMVET] url: ${url}\n${"#".repeat(60)}`);

    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    let parsed: URL;
    try { parsed = new URL(url); } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const baseUrl = toBaseUrl(url);
    console.log(`[WISDOMVET] Base URL: ${baseUrl}`);

    // ── Strategy 1: WooCommerce Store API ─────────────────────────────────────
    // Extract optional category from URL like /product-category/SLUG/
    const catMatch = parsed.pathname.match(/\/product-category\/([^/]+)/);
    const categorySlug = catMatch ? catMatch[1] : undefined;

    const apiProducts = await tryWcStoreApi(parsed.origin, categorySlug);
    if (apiProducts && apiProducts.length > 0) {
      console.log(`\n[WISDOMVET] Enriching ${apiProducts.length} products from detail pages...`);
      const enriched: ExtractedProduct[] = [];

      for (let i = 0; i < apiProducts.length; i += 3) {
        const batch = apiProducts.slice(i, i + 3);
        const results = await Promise.all(batch.map(async p => {
          if (!p.productLink) return p;
          const h = await fetchHtml(p.productLink);
          if (!h) return p;
          const detail = parseProductCheerio(h, p.productLink);
          if (!detail) return p;

          const isReal = (u: string) => isImageUrl(u);
          const bestImage = isReal(detail.imageUrl) ? detail.imageUrl
            : isReal(p.imageUrl) ? p.imageUrl
            : "";

          return {
            ...p,
            description:     detail.description     || p.description,
            dosage:          detail.dosage           || p.dosage,
            genericName:     detail.genericName      || p.genericName,
            productType:     detail.productType      || p.productType,
            category:        detail.category         || p.category,
            subCategory:     detail.subCategory      || p.subCategory,
            subsubCategory:  detail.subsubCategory   || p.subsubCategory,
            imageUrl:        bestImage,
            outofstock:      detail.outofstock       || p.outofstock,
            variants: (detail.variants.length > 0 && detail.variants.some(v => v.customerPrice))
              ? detail.variants : p.variants,
          } as ExtractedProduct;
        }));
        results.forEach(r => enriched.push(r));
        console.log(`[WISDOMVET] Enriched batch ${Math.floor(i / 3) + 1}, total: ${enriched.length}`);
      }

      console.log(`[WISDOMVET] ✓ Done — ${enriched.length} products`);
      return NextResponse.json({ success: true, count: enriched.length, totalLinks: enriched.length, products: enriched });
    }

    // ── Strategy 2: HTML parsing with pagination ───────────────────────────────
    console.log(`\n[WISDOMVET] Falling back to HTML parsing...`);
    const html = await fetchHtml(baseUrl);
    if (!html) return NextResponse.json({ error: "Could not fetch the URL." }, { status: 400 });

    let allLinks = getProductLinks(html, parsed.origin);
    const paginationPages = getPaginationLinks(html, parsed.origin);

    for (const pageUrl of paginationPages) {
      const pageHtml = await fetchHtml(pageUrl);
      if (!pageHtml) continue;
      const pageLinks = getProductLinks(pageHtml, parsed.origin);
      for (const l of pageLinks) if (!allLinks.includes(l)) allLinks.push(l);
      console.log(`[WISDOMVET] Page ${pageUrl}: +${pageLinks.length} links, total: ${allLinks.length}`);
    }

    if (!allLinks.length) {
      const single = parseProductCheerio(html, baseUrl);
      if (single) return NextResponse.json({ success: true, count: 1, totalLinks: 1, products: [single] });
      return NextResponse.json({ error: "No products found on this page." }, { status: 400 });
    }

    console.log(`\n[WISDOMVET] Total: ${allLinks.length} products to fetch`);
    const products: ExtractedProduct[] = [];

    for (let i = 0; i < allLinks.length; i += 3) {
      const batch = allLinks.slice(i, i + 3);
      const results = await Promise.all(batch.map(async link => {
        const h = await fetchHtml(link);
        return h ? parseProductCheerio(h, link) : null;
      }));
      results.forEach(r => r && products.push(r));
      console.log(`[WISDOMVET] Batch ${Math.floor(i / 3) + 1}, total: ${products.length}`);
    }

    console.log(`[WISDOMVET] ✓ Done — ${products.length} products`);
    return NextResponse.json({ success: true, count: products.length, totalLinks: allLinks.length, products });

  } catch (e: any) {
    console.log(`[WISDOMVET] ✗ Fatal: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message || "Scraping failed" }, { status: 500 });
  }
}
