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
  Referer: "https://muslimherbalandnutraceutical.com/",
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const isImageUrl = (u: string) =>
  /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(u) &&
  !u.includes("placeholder") &&
  !u.includes("admin-ajax") &&
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

async function fetchJson(url: string): Promise<any> {
  try {
    const res = await axios.get(url, {
      headers: { ...HEADERS, Accept: "application/json" },
      timeout: 20000,
      httpsAgent,
      validateStatus: (s) => s < 500,
    });
    if (res.status >= 400) return null;
    return res.data;
  } catch { return null; }
}

// ── WooCommerce Store API ─────────────────────────────────────────────────────
async function fetchWcProducts(origin: string, categorySlug?: string): Promise<ExtractedProduct[]> {
  const products: ExtractedProduct[] = [];
  let page = 1;

  while (true) {
    const catParam = categorySlug ? `&category=${encodeURIComponent(categorySlug)}` : "";
    const data = await fetchJson(
      `${origin}/wp-json/wc/store/v1/products?per_page=100&page=${page}${catParam}`
    );
    if (!data || !Array.isArray(data) || !data.length) break;

    for (const item of data) {
      const name = clean(item.name || "");
      if (!name) continue;

      const imgObj = item.images?.[0] || {};
      const rawImg = imgObj.src || imgObj.thumbnail || "";
      const imageUrl = isImageUrl(rawImg) ? rawImg : "";

      const cats: string[] = (item.categories || []).map((c: any) => clean(c.name)).filter(Boolean);

      const priceObj = item.prices || {};
      const rawPrice = priceObj.price || priceObj.regular_price || "";
      const decimals = priceObj.currency_minor_unit ?? 2;
      const price = rawPrice ? (parseInt(rawPrice) / Math.pow(10, decimals)).toFixed(0) : "";

      const rawDesc = item.short_description || item.description || "";
      const description = clean(cheerio.load(rawDesc).text()).substring(0, 2000);

      products.push({
        productName: name,
        genericName: "",
        category:       cats[0] || "",
        subCategory:    cats[1] || "",
        subsubCategory: cats[2] || "",
        productType: "",
        description,
        dosage: "",
        productLink: item.permalink || "",
        imageUrl,
        outofstock: item.is_in_stock === false || item.stock_status === "outofstock",
        variants: [{ packingVolume: "", customerPrice: price }],
      });
    }

    if (data.length < 100) break;
    page++;
  }

  console.log(`[WC-API] ${products.length} products`);
  return products;
}

// ── Detail page parser ────────────────────────────────────────────────────────
function parseDetailPage(html: string, url: string): Partial<ExtractedProduct> {
  const $raw = cheerio.load(html);
  const origin = new URL(url).origin;

  // ── Image ─────────────────────────────────────────────────────────────────
  const imgCandidates = [
    $raw(".woocommerce-product-gallery img").first().attr("data-large_image"),
    $raw(".woocommerce-product-gallery img").first().attr("data-src"),
    $raw(".woocommerce-product-gallery img").first().attr("src"),
    $raw('meta[property="og:image"]').attr("content"),
  ];
  const rawImage = imgCandidates.find(c => c && isImageUrl(c)) || "";
  const imageUrl = rawImage ? resolveUrl(origin, rawImage) : "";

  // ── Variants ──────────────────────────────────────────────────────────────
  const variants: ExtractedVariant[] = [];
  const variationAttr = $raw("form.variations_form").attr("data-product_variations") || "";
  if (variationAttr && variationAttr !== "false") {
    try {
      const variations = JSON.parse(variationAttr);
      if (Array.isArray(variations) && variations.length > 0) {
        for (const v of variations) {
          const label = Object.values(v.attributes || {}).filter((val: any) => val).join(" / ");
          const price = v.display_price != null ? String(Math.round(v.display_price)) : "";
          if (label || price) variants.push({ packingVolume: label as string, customerPrice: price });
        }
      }
    } catch { /* skip */ }
  }

  if (!variants.length) {
    $raw(".variations select option, select[name*='attribute'] option").each((_, el) => {
      const val = clean($raw(el).text());
      if (val && !/choose|select/i.test(val))
        variants.push({ packingVolume: val, customerPrice: "" });
    });
  }

  // ── Description from tab ──────────────────────────────────────────────────
  const $clean = cheerio.load(html);
  $clean("script, style, nav, header, footer, noscript").remove();

  const description = clean(
    $clean("#tab-description").text() ||
    $clean(".woocommerce-Tabs-panel--description").text() ||
    $clean(".woocommerce-product-details__short-description").text() ||
    $clean('meta[property="og:description"]').attr("content") || ""
  ).substring(0, 3000);

  // ── Dosage / directions ───────────────────────────────────────────────────
  let dosage = "";
  $clean(".wc-tab, .woocommerce-Tabs-panel, .tab-content, .accordion-item").each((_, el) => {
    const heading = clean($clean(el).find("h2,h3,h4,.tab-title").first().text());
    if (/direction|dosage|usage|feeding|how to|administration|recommended/i.test(heading)) {
      dosage = clean($clean(el).text().replace(heading, "")).substring(0, 1000);
      return false;
    }
  });

  // ── Generic name / brand ──────────────────────────────────────────────────
  const genericName = clean(
    $raw(".product_meta .brand a, .product_meta [class*='brand'] a").first().text() ||
    $raw('meta[property="product:brand"]').attr("content") || ""
  );

  console.log(`[DETAIL] img=${imageUrl ? "✓" : "✗"} variants=${variants.length} desc=${description.length}c`);
  return { imageUrl, description, dosage, genericName, variants: variants.length ? variants : undefined };
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
    const pathParts = parsed.pathname.replace(/\/$/, "").split("/").filter(Boolean);

    // Support /shop, /shop/category/SLUG, /product-category/SLUG
    const shopIndex = pathParts.indexOf("shop");
    const catIndex  = pathParts.indexOf("product-category");

    let categorySlug: string | undefined;
    if (catIndex >= 0 && pathParts[catIndex + 1]) {
      categorySlug = pathParts[catIndex + 1];
    } else if (shopIndex >= 0 && pathParts[shopIndex + 1]) {
      // e.g. /shop/category/SLUG or /shop/SLUG
      const next = pathParts[shopIndex + 1];
      if (next !== "page") categorySlug = pathParts[pathParts.length - 1];
    }

    console.log(`[MUSLIMHERBAL] origin=${origin}, category=${categorySlug || "all"}`);

    const apiProducts = await fetchWcProducts(origin, categorySlug);
    if (!apiProducts.length)
      return NextResponse.json({ error: "No products found. Check the URL." }, { status: 400 });

    // Enrich with detail pages in batches of 3
    const enriched: ExtractedProduct[] = [];
    for (let i = 0; i < apiProducts.length; i += 3) {
      const batch = apiProducts.slice(i, i + 3);
      const results = await Promise.all(batch.map(async (p) => {
        if (!p.productLink) return p;
        const h = await fetchHtml(p.productLink);
        if (!h) return p;
        const detail = parseDetailPage(h, p.productLink);
        return {
          ...p,
          imageUrl:    isImageUrl(detail.imageUrl || "") ? detail.imageUrl! : p.imageUrl,
          description: detail.description || p.description,
          dosage:      detail.dosage      || p.dosage,
          genericName: detail.genericName || p.genericName,
          variants:    detail.variants?.length ? detail.variants : p.variants,
        } as ExtractedProduct;
      }));
      results.forEach(r => enriched.push(r));
      console.log(`[MUSLIMHERBAL] batch ${Math.floor(i / 3) + 1}, total: ${enriched.length}`);
    }

    return NextResponse.json({ success: true, count: enriched.length, totalLinks: enriched.length, products: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Scraping failed" }, { status: 500 });
  }
}
