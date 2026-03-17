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
  Referer: "https://www.petshub.pk/",
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

// ── WooCommerce Store API ─────────────────────────────────────────────────────
async function fetchWcProducts(origin: string, categorySlug?: string): Promise<ExtractedProduct[]> {
  console.log(`\n[WC-API] Fetching products, category: ${categorySlug || "all"}`);
  const products: ExtractedProduct[] = [];
  let page = 1;

  while (true) {
    const catParam = categorySlug ? `&category=${encodeURIComponent(categorySlug)}` : "";
    const url = `${origin}/wp-json/wc/store/v1/products?per_page=100&page=${page}${catParam}`;
    const data = await fetchJson(url);

    if (!data || !Array.isArray(data) || data.length === 0) break;
    console.log(`[WC-API] Page ${page}: ${data.length} products`);

    for (const item of data) {
      const name = clean(item.name || "");
      if (!name) continue;

      const imgObj = item.images?.[0] || {};
      const rawImg = imgObj.src || imgObj.thumbnail || "";
      const imageUrl = isImageUrl(rawImg) ? rawImg : "";

      const cats: string[] = (item.categories || []).map((c: any) => clean(c.name)).filter(Boolean);
      const category       = cats[0] || "";
      const subCategory    = cats[1] || "";
      const subsubCategory = cats[2] || "";

      const priceObj  = item.prices || {};
      const rawPrice  = priceObj.price || priceObj.regular_price || "";
      const decimals  = priceObj.currency_minor_unit ?? 2;
      const price     = rawPrice ? (parseInt(rawPrice) / Math.pow(10, decimals)).toFixed(0) : "";

      const rawDesc   = item.short_description || item.description || "";
      const description = clean(cheerio.load(rawDesc).text()).substring(0, 2000);

      // Variants from WC API (will be enriched from detail page later)
      const variants: ExtractedVariant[] = [];
      if (item.variations?.length) {
        for (const v of item.variations) {
          const label = (v.attributes || []).map((a: any) => a.value).join(" / ");
          const vPrice = v.price_html
            ? clean(cheerio.load(v.price_html).text()).replace(/[^\d.]/g, "")
            : price;
          variants.push({ packingVolume: label, customerPrice: vPrice });
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
        imageUrl,
        outofstock: item.is_in_stock === false || item.stock_status === "outofstock",
        variants,
      });
    }

    if (data.length < 100) break;
    page++;
  }

  console.log(`[WC-API] ✓ ${products.length} products`);
  return products;
}

// ── Parse variant prices from a WooCommerce variable product detail page ───────
function parseDetailPage(html: string, url: string): Partial<ExtractedProduct> {
  console.log(`\n[DETAIL] ${url}`);
  const $raw = cheerio.load(html);
  const origin = new URL(url).origin;

  // ── Variants from embedded variation JSON ─────────────────────────────────
  // WooCommerce inlines all variations as JSON on the form element:
  // <form class="variations_form" data-product_variations='[{...}]'>
  const variants: ExtractedVariant[] = [];
  const variationAttr = $raw("form.variations_form").attr("data-product_variations") || "";
  if (variationAttr && variationAttr !== "false") {
    try {
      const variations = JSON.parse(variationAttr);
      if (Array.isArray(variations) && variations.length > 0) {
        for (const v of variations) {
          // Attribute labels: { attribute_pa_weight: "400g", ... }
          const label = Object.values(v.attributes || {})
            .filter((val: any) => val)
            .join(" / ");
          // display_price is the actual price shown to user
          const price = v.display_price != null ? String(Math.round(v.display_price)) : "";
          if (label || price) variants.push({ packingVolume: label, customerPrice: price });
        }
        console.log(`[DETAIL] ${variants.length} variants from JSON`);
      }
    } catch (e: any) {
      console.log(`[DETAIL] Variation JSON parse error: ${e.message}`);
    }
  }

  // Fallback: parse <select> options (they show names but not always prices)
  if (!variants.length) {
    $raw(".variations select option, select[name*='attribute'] option").each((_, el) => {
      const val = clean($raw(el).text());
      if (val && !/choose|select/i.test(val)) {
        variants.push({ packingVolume: val, customerPrice: "" });
      }
    });
    if (variants.length) console.log(`[DETAIL] ${variants.length} variants from <select>`);
  }

  // ── Image ─────────────────────────────────────────────────────────────────
  const candidates = [
    $raw(".woocommerce-product-gallery img").first().attr("data-large_image"),
    $raw(".woocommerce-product-gallery img").first().attr("data-src"),
    $raw(".woocommerce-product-gallery img").first().attr("src"),
    $raw('meta[property="og:image"]').attr("content"),
  ];
  const rawImage = candidates.find(c => c && isImageUrl(c)) || "";
  const imageUrl = rawImage ? resolveUrl(origin, rawImage) : "";

  // ── Description ───────────────────────────────────────────────────────────
  const $clean = cheerio.load(html);
  $clean("script, style, nav, header, footer, noscript").remove();
  const description = clean(
    $clean(".woocommerce-product-details__short-description").text() ||
    $clean("#tab-description").text() ||
    $clean(".woocommerce-Tabs-panel--description").text() ||
    $clean('meta[property="og:description"]').attr("content") || ""
  ).substring(0, 2000);

  // ── Generic name / brand ──────────────────────────────────────────────────
  const genericName = clean(
    $raw(".product_meta .brand a").first().text() ||
    $raw('meta[property="product:brand"]').attr("content") || ""
  );

  // ── Dosage / directions ───────────────────────────────────────────────────
  let dosage = "";
  $clean(".wc-tab, .woocommerce-Tabs-panel, .tab-content, .accordion-item").each((_, el) => {
    const heading = clean($clean(el).find("h2,h3,h4,.tab-title").first().text());
    if (/direction|dosage|usage|feeding|how to/i.test(heading)) {
      dosage = clean($clean(el).text().replace(heading, "")).substring(0, 1000);
      return false;
    }
  });

  console.log(`[DETAIL] img=${imageUrl ? "✓" : "✗"}, variants=${variants.length}, desc=${description.length}chars`);
  return { imageUrl, description, genericName, dosage, variants: variants.length ? variants : undefined };
}

// ── POST handler ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    console.log(`\n${"#".repeat(60)}\n[PETSHUB] url: ${url}\n${"#".repeat(60)}`);

    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    let parsed: URL;
    try { parsed = new URL(url); } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const origin = parsed.origin;

    // Extract category slug from URL paths like /royal-canin-cat-food/ or /product-category/SLUG/
    const pathParts = parsed.pathname.replace(/\/$/, "").split("/").filter(Boolean);
    const catIndex  = pathParts.indexOf("product-category");
    const categorySlug = catIndex >= 0
      ? pathParts[catIndex + 1]
      : pathParts[pathParts.length - 1] || undefined;

    console.log(`[PETSHUB] origin: ${origin}, categorySlug: ${categorySlug}`);

    // ── WC Store API ──────────────────────────────────────────────────────────
    const apiProducts = await fetchWcProducts(origin, categorySlug);

    if (!apiProducts.length) {
      return NextResponse.json({ error: "No products found. Check the URL." }, { status: 400 });
    }

    // ── Enrich each product with detail page (for variants + better data) ─────
    console.log(`\n[PETSHUB] Enriching ${apiProducts.length} products...`);
    const enriched: ExtractedProduct[] = [];

    for (let i = 0; i < apiProducts.length; i += 3) {
      const batch = apiProducts.slice(i, i + 3);
      const results = await Promise.all(batch.map(async (p) => {
        if (!p.productLink) return p;
        const h = await fetchHtml(p.productLink);
        if (!h) return p;
        const detail = parseDetailPage(h, p.productLink);

        // Pick best image
        const bestImage = isImageUrl(detail.imageUrl || "") ? detail.imageUrl!
          : isImageUrl(p.imageUrl) ? p.imageUrl
          : "";

        return {
          ...p,
          imageUrl:    bestImage,
          description: detail.description  || p.description,
          genericName: detail.genericName  || p.genericName,
          dosage:      detail.dosage       || p.dosage,
          // Use detail variants if we got them (they have real prices per size)
          variants:    (detail.variants && detail.variants.length > 0) ? detail.variants : p.variants,
        } as ExtractedProduct;
      }));
      results.forEach(r => enriched.push(r));
      console.log(`[PETSHUB] Enriched batch ${Math.floor(i / 3) + 1}, total: ${enriched.length}`);
    }

    console.log(`[PETSHUB] ✓ Done — ${enriched.length} products`);
    return NextResponse.json({
      success: true,
      count: enriched.length,
      totalLinks: enriched.length,
      products: enriched,
    });

  } catch (e: any) {
    console.log(`[PETSHUB] ✗ Fatal: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message || "Scraping failed" }, { status: 500 });
  }
}
