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
  try { const u = new URL(url); return `${u.origin}${u.pathname}`.replace(/\/$/, ""); } catch { return url; }
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
    console.log(`[FETCH] ← status: ${res.status}, ${String(res.data).length} chars`);
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
    if (res.status >= 400) { console.log(`[FETCH-JSON] ✗ status ${res.status}`); return null; }
    console.log(`[FETCH-JSON] ✓`);
    return res.data;
  } catch (e: any) {
    console.log(`[FETCH-JSON] ✗ ${e.message}`);
    return null;
  }
}

// ── Strip category base URL to page 1 ─────────────────────────────────────────
function toBaseCategoryUrl(url: string): string {
  try {
    const u = new URL(url);
    u.pathname = u.pathname.replace(/\/page\/\d+\/?$/, "").replace(/\/$/, "");
    u.search = "";
    return u.href;
  } catch { return url; }
}

// ── Extract category slug from URL ────────────────────────────────────────────
function getCategorySlug(url: string): string {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/product-category\/([^/]+)/);
    return m ? m[1] : "";
  } catch { return ""; }
}

// ── Try WooCommerce Store API v1 ──────────────────────────────────────────────
async function tryWcStoreApi(origin: string, categorySlug: string): Promise<ExtractedProduct[] | null> {
  console.log(`\n[WC-API] Trying Store API for category: ${categorySlug}`);
  const products: ExtractedProduct[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const apiUrl = `${origin}/wp-json/wc/store/v1/products?category=${encodeURIComponent(categorySlug)}&per_page=100&page=${page}`;
    const data = await fetchJson(apiUrl);
    if (!data || !Array.isArray(data)) {
      console.log(`[WC-API] No data on page ${page}`);
      break;
    }
    if (data.length === 0) break;

    console.log(`[WC-API] Page ${page}: ${data.length} products`);

    for (const item of data) {
      const name = clean(item.name || "");
      if (!name) continue;

      const imgObj = item.images?.[0] || {};
      const imageUrl = imgObj.src || imgObj.thumbnail || imgObj.url || "";
      console.log(`[WC-API] "${name}" image: "${imageUrl}"`);
      const cats: string[] = (item.categories || []).map((c: any) => clean(c.name)).filter(Boolean);
      const category      = cats[0] || "";
      const subCategory   = cats[1] || "";
      const subsubCategory = cats[2] || "";

      // Price
      const priceObj = item.prices || {};
      const rawPrice = priceObj.price || priceObj.regular_price || "";
      const decimals = priceObj.currency_minor_unit ?? 2;
      const price = rawPrice ? (parseInt(rawPrice) / Math.pow(10, decimals)).toFixed(2) : "";

      // Description — strip HTML tags
      const rawDesc = item.short_description || item.description || "";
      const description = clean(cheerio.load(rawDesc).text()).substring(0, 2000);

      // Variants (variable product)
      const variants: ExtractedVariant[] = [];
      if (item.variations && item.variations.length > 0) {
        // Variations are stubs — we'll enrich from detail page later
        // For now just make one variant per variation stub
        for (const v of item.variations) {
          variants.push({ packingVolume: v.attributes?.map((a: any) => a.value).join(" / ") || "", customerPrice: price });
        }
      }
      if (!variants.length) {
        variants.push({ packingVolume: "", customerPrice: price });
      }

      products.push({
        productName: name,
        genericName: "",
        category, subCategory, subsubCategory,
        productType: "",
        description,
        dosage: "",
        productLink: item.permalink || "",
        imageUrl,
        outofstock: item.stock_status === "outofstock",
        variants,
      });
    }

    // Check total pages from headers (axios doesn't expose them easily from fetchJson)
    page++;
    if (data.length < 100) break; // Last page
  }

  if (!products.length) return null;
  console.log(`[WC-API] ✓ Got ${products.length} products via Store API`);
  return products;
}

// ── HTML: get product links from a WooCommerce category listing page ──────────
function getProductLinks(html: string, origin: string): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const links: string[] = [];

  // WooCommerce product links
  $("a.woocommerce-loop-product__link, .products .product a, li.product a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const full = resolveUrl(origin, href);
    try {
      const u = new URL(full);
      if (u.origin !== origin) return;
      // Accept /product/ or /shop/ paths, but NOT category/tag archive pages
      if (!/\/(product|shop)\//.test(u.pathname)) return;
      if (/\/product-category\/|\/product-tag\//i.test(u.pathname)) return;
      const key = normalizeUrl(full);
      if (!seen.has(key)) { seen.add(key); links.push(key); }
    } catch { /* skip */ }
  });

  console.log(`[LINKS] Found ${links.length} product links`);
  return links;
}

// ── HTML: pagination links ──────────────────────────────────────────────────
function getPaginationLinks(html: string, origin: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const pages: string[] = [];

  $("a[href]").each((_, el) => {
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

// ── Parse a WooCommerce product detail page ───────────────────────────────────
function parseProductCheerio(html: string, url: string): ExtractedProduct | null {
  console.log(`\n[CHEERIO] Parsing: ${url}`);
  const $raw = cheerio.load(html);
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, noscript").remove();

  const origin = new URL(url).origin;

  // ── JSON-LD ────────────────────────────────────────────────────────────────
  let name = "", price = "", availability = "", imageUrl = "", ldDesc = "", currency = "";
  const ldVariants: ExtractedVariant[] = [];
  let breadcrumb: string[] = [];

  $raw('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($raw(el).html() || "{}");
      (Array.isArray(json) ? json : [json]).forEach((item: any) => {
        if (item["@type"] === "BreadcrumbList") {
          breadcrumb = (item.itemListElement || [])
            .sort((a: any, b: any) => a.position - b.position)
            .map((c: any) => c.name as string)
            .filter((n: string) => n && n !== "Home");
          if (breadcrumb.length > 1) breadcrumb = breadcrumb.slice(0, -1); // remove product name
          console.log(`[CHEERIO] Breadcrumb: ${breadcrumb.join(" > ")}`);
        }
        if (item["@type"] === "Product") {
          if (!name) name = item.name || "";
          const img = item.image; imageUrl = imageUrl || (Array.isArray(img) ? img[0] : img || "");
          const o = Array.isArray(item.offers) ? item.offers[0] : item.offers || {};
          if (!price && o.price != null) price = String(o.price);
          if (!currency) currency = o.priceCurrency || "";
          if (!availability) availability = (o.availability || "").replace("https://schema.org/", "");
          if (!ldDesc && item.description && !/^\d+$/.test(item.description.trim())) ldDesc = item.description;
        }
      });
    } catch (e: any) { console.log(`[CHEERIO] JSON-LD err: ${e.message}`); }
  });

  // ── Fallback name ─────────────────────────────────────────────────────────
  const productName = name ||
    clean($(".product_title, h1.entry-title, h1").first().text()) ||
    clean($('meta[property="og:title"]').attr("content") || "");
  if (!productName) { console.log(`[CHEERIO] ✗ No product name`); return null; }
  console.log(`[CHEERIO] productName: "${productName}"`);

  // ── Image — use $raw (unmodified HTML) to avoid missing lazy-load attrs ──
  const galleryImg = $raw(".woocommerce-product-gallery img, .wp-post-image").first();
  const imgLarge    = galleryImg.attr("data-large_image") || "";
  const imgDataSrc  = galleryImg.attr("data-src") || "";
  const imgLazySrc  = galleryImg.attr("data-lazy-src") || "";
  const imgSrc      = galleryImg.attr("src") || "";
  // WC often wraps gallery <img> in <a href="full-size-url">
  const imgAHref    = galleryImg.closest("a").attr("href") || "";
  const ogImage     = $raw('meta[property="og:image"]').attr("content") || "";
  const twitterImg  = $raw('meta[name="twitter:image"]').attr("content") || "";

  // Priority: JSON-LD > data-large_image > data-src > data-lazy-src > a[href] (if image ext) > og:image > src (if not placeholder)
  const isImageUrl = (u: string) => /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(u) && !u.includes("placeholder");
  const rawImage =
    (imageUrl && isImageUrl(imageUrl) ? imageUrl : "") ||
    (imgLarge && isImageUrl(imgLarge) ? imgLarge : "") ||
    (imgDataSrc && isImageUrl(imgDataSrc) ? imgDataSrc : "") ||
    (imgLazySrc && isImageUrl(imgLazySrc) ? imgLazySrc : "") ||
    (imgAHref && isImageUrl(imgAHref) ? imgAHref : "") ||
    (ogImage && isImageUrl(ogImage) ? ogImage : "") ||
    (twitterImg && isImageUrl(twitterImg) ? twitterImg : "") ||
    (imgSrc && isImageUrl(imgSrc) ? imgSrc : "") ||
    ""; // Never fall back to non-image URLs (admin-ajax, etc.)
  const image = resolveUrl(origin, rawImage);
  console.log(`[CHEERIO] image: "${image}"`);

  // ── Categories from breadcrumb / WC breadcrumb ────────────────────────────
  if (!breadcrumb.length) {
    $(".woocommerce-breadcrumb, nav.woocommerce-breadcrumb").find("a, span").each((_, el) => {
      const t = clean($(el).text());
      if (t && t !== "Home" && t !== productName) breadcrumb.push(t);
    });
  }
  const category      = breadcrumb[0] || "";
  const subCategory   = breadcrumb[1] || "";
  const subsubCategory = breadcrumb[2] || "";

  // ── Price ─────────────────────────────────────────────────────────────────
  if (!price) {
    const priceEl = $(".woocommerce-Price-amount bdi, .woocommerce-Price-amount, .price ins .amount, .price .amount").first();
    const rawPrice = clean(priceEl.text()).replace(/[^\d.]/g, "");
    if (rawPrice && parseFloat(rawPrice) > 0) price = rawPrice;
  }
  console.log(`[CHEERIO] price: "${price}"`);

  // ── Description ───────────────────────────────────────────────────────────
  let description = ldDesc;
  if (!description) {
    const shortDesc = clean($(".woocommerce-product-details__short-description").text());
    const longDesc  = clean($("#tab-description .woocommerce-Tabs-panel").text() ||
                            $(".woocommerce-Tabs-panel--description").text() ||
                            $(".entry-content.wc-tab").text());
    description = (shortDesc || longDesc || "").substring(0, 2000);
  }

  // ── Dosage / Usage ────────────────────────────────────────────────────────
  let dosage = "";
  // Check WC tabs for directions/usage
  $(".wc-tab, .woocommerce-Tabs-panel").each((_, tab) => {
    const heading = clean($(tab).find("h2, h3").first().text());
    if (/direction|dosage|usage|how to use|feeding|instruction/i.test(heading)) {
      dosage = clean($(tab).text().replace(heading, "")).substring(0, 1000);
      return false;
    }
  });
  if (!dosage) {
    // Try any accordion/tab headings
    $(".tab-content, .accordion-item, .card").each((_, el) => {
      const h = clean($(el).find("h2,h3,h4,.tab-title,.accordion-header,.card-header").first().text());
      if (/direction|dosage|usage|how to use|feeding/i.test(h)) {
        dosage = clean($(el).find(".tab-pane, .accordion-body, .card-body").text()).substring(0, 1000);
        return false;
      }
    });
  }

  // ── Variants (WooCommerce variable product) ────────────────────────────────
  let variants: ExtractedVariant[] = [];

  // Try JSON in <script> for WC variation data
  let foundVariationsJson = false;
  $raw("script").each((_, el) => {
    const content = $raw(el).html() || "";
    if (content.includes('"variations"') || content.includes("wc_product_block_data")) {
      try {
        const m = content.match(/var\s+\w+\s*=\s*(\{.*?"variations".*?\})\s*;/s) ||
                  content.match(/\((\{.*?"variations".*?\})\)/s);
        if (m) {
          const data = JSON.parse(m[1]);
          if (Array.isArray(data.variations)) {
            for (const v of data.variations) {
              const attrNames = Object.values(v.attributes || {}).join(" / ");
              const vPrice = v.display_price ? String(v.display_price) : price;
              if (vPrice) variants.push({ packingVolume: attrNames, customerPrice: vPrice });
            }
            if (variants.length) { foundVariationsJson = true; return false; }
          }
        }
      } catch { /* skip */ }
    }
  });

  // Fallback: simple/single variant
  if (!variants.length && price) {
    variants = [{ packingVolume: "", customerPrice: price }];
  }

  console.log(`[CHEERIO] variants: ${variants.length}`);

  return {
    productName: clean(productName),
    genericName: "",
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
    console.log(`\n${"#".repeat(60)}\n[PETZSEE] url: ${url}\n${"#".repeat(60)}`);

    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    let parsed: URL;
    try { parsed = new URL(url); } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Always strip /page/N to start from page 1
    const baseUrl = toBaseCategoryUrl(url);
    console.log(`[PETZSEE] Base URL: ${baseUrl}`);

    // ── Strategy 1: WooCommerce Store API ─────────────────────────────────────
    const categorySlug = getCategorySlug(baseUrl);
    if (categorySlug) {
      const apiProducts = await tryWcStoreApi(parsed.origin, categorySlug);
      if (apiProducts && apiProducts.length > 0) {
        // Enrich each product with detail page data (description, dosage, real variants)
        console.log(`\n[PETZSEE] Enriching ${apiProducts.length} products from detail pages...`);
        const enriched: ExtractedProduct[] = [];

        for (let i = 0; i < apiProducts.length; i += 3) {
          const batch = apiProducts.slice(i, i + 3);
          const results = await Promise.all(batch.map(async p => {
            if (!p.productLink) return p;
            const h = await fetchHtml(p.productLink);
            if (!h) return p;
            const detail = parseProductCheerio(h, p.productLink);
            if (!detail) return p;
            // Merge: prefer detail page data but keep API category/image if missing
            return {
              ...p,
              description: detail.description || p.description,
              dosage: detail.dosage || p.dosage,
              genericName: detail.genericName || p.genericName,
              productType: detail.productType || p.productType,
              category: detail.category || p.category,
              subCategory: detail.subCategory || p.subCategory,
              subsubCategory: detail.subsubCategory || p.subsubCategory,
              imageUrl: (() => {
                const di = detail.imageUrl || "";
                const pi = p.imageUrl || "";
                // Real image = has image extension and isn't a placeholder or admin-ajax
                const isReal = (u: string) => /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(u) && !u.includes("placeholder") && !u.includes("admin-ajax");
                if (isReal(di)) return di;
                if (isReal(pi)) return pi;
                return "";
              })(),
              outofstock: detail.outofstock || p.outofstock,
              // Use detail variants if they have data, else keep API variants
              variants: (detail.variants.length > 0 && detail.variants.some(v => v.customerPrice))
                ? detail.variants
                : p.variants,
            } as ExtractedProduct;
          }));
          results.forEach(r => enriched.push(r));
          console.log(`[PETZSEE] Enriched batch ${Math.floor(i/3)+1}, total: ${enriched.length}`);
        }

        console.log(`[PETZSEE] ✓ Done — ${enriched.length} products`);
return NextResponse.json({ success: true, count: enriched.length, totalLinks: enriched.length, products: enriched });
      }
    }

    // ── Strategy 2: HTML parsing with pagination ──────────────────────────────
    console.log(`\n[PETZSEE] Falling back to HTML parsing...`);
    const html = await fetchHtml(baseUrl);
    if (!html) return NextResponse.json({ error: "Could not fetch the URL." }, { status: 400 });

    let allLinks = getProductLinks(html, parsed.origin);
    const paginationPages = getPaginationLinks(html, parsed.origin, baseUrl);

    for (const pageUrl of paginationPages) {
      const pageHtml = await fetchHtml(pageUrl);
      if (!pageHtml) continue;
      const pageLinks = getProductLinks(pageHtml, parsed.origin);
      for (const l of pageLinks) {
        if (!allLinks.includes(l)) allLinks.push(l);
      }
      console.log(`[PETZSEE] Page ${pageUrl}: +${pageLinks.length} links, total: ${allLinks.length}`);
    }

    if (!allLinks.length) {
      // Try URL itself as single product
      const single = parseProductCheerio(html, baseUrl);
      if (single) return NextResponse.json({ success: true, count: 1, totalLinks: 1, products: [single] });
      return NextResponse.json({ error: "No products found on this page." }, { status: 400 });
    }

    console.log(`\n[PETZSEE] Total: ${allLinks.length} products to fetch`);
    const products: ExtractedProduct[] = [];

    for (let i = 0; i < allLinks.length; i += 3) {
      const batch = allLinks.slice(i, i + 3);
      const results = await Promise.all(batch.map(async link => {
        const h = await fetchHtml(link);
        return h ? parseProductCheerio(h, link) : null;
      }));
      results.forEach(r => r && products.push(r));
    }

    console.log(`[PETZSEE] ✓ Done — ${products.length} products`);
    return NextResponse.json({ success: true, count: products.length, totalLinks: allLinks.length, products });

  } catch (e: any) {
    console.log(`[PETZSEE] ✗ Fatal: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message || "Scraping failed" }, { status: 500 });
  }
}
