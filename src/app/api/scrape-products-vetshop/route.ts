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
  Referer: "https://vet-shop.net/",
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

// ── WC Store API ──────────────────────────────────────────────────────────────
async function fetchWcProducts(origin: string, categorySlug?: string): Promise<ExtractedProduct[]> {
  const products: ExtractedProduct[] = [];
  let page = 1;

  while (true) {
    const catParam = categorySlug ? `&category=${encodeURIComponent(categorySlug)}` : "";
    const data = await fetchJson(`${origin}/wp-json/wc/store/v1/products?per_page=100&page=${page}${catParam}`);
    if (!data || !Array.isArray(data) || !data.length) break;

    for (const item of data) {
      const name = clean(item.name || "");
      if (!name) continue;

      const imgObj = item.images?.[0] || {};
      const imageUrl = isImageUrl(imgObj.src || "") ? imgObj.src : "";

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
        outofstock: item.is_in_stock === false,
        // price stored as single variant — will be enriched with packaging from detail page
        variants: [{ packingVolume: "", customerPrice: price }],
      });
    }

    if (data.length < 100) break;
    page++;
  }

  console.log(`[WC-API] ${products.length} products`);
  return products;
}

// ── Extract sections from inline description on detail page ───────────────────
// vet-shop.net puts everything inline: COMPOSITION, INDICATIONS, DOSAGE, PACKAGING
function parseDetailPage(html: string, url: string, apiPrice: string): Partial<ExtractedProduct> {
  const $ = cheerio.load(html);
  const origin = new URL(url).origin;

  // ── Image ─────────────────────────────────────────────────────────────────
  // Elementor uses img.attachment-full (not WC gallery)
  let imageUrl = "";
  const imgCandidates = [
    $(".woocommerce-product-gallery img").first().attr("data-large_image"),
    $(".woocommerce-product-gallery img").first().attr("src"),
    $("img.attachment-full, img.size-full, img.wp-post-image").first().attr("src"),
    $('meta[property="og:image"]').attr("content"),
  ];
  for (const c of imgCandidates) {
    if (c && isImageUrl(c)) { imageUrl = resolveUrl(origin, c); break; }
  }

  // ── Full page text content ─────────────────────────────────────────────────
  $("script, style, nav, header, footer, noscript, .elementor-nav-menu, .woocommerce-breadcrumb").remove();

  // Grab all text content from the product content area
  const contentSelectors = [
    ".elementor-widget-text-editor",
    ".woocommerce-product-details__short-description",
    ".entry-content",
    ".elementor-widget-woocommerce-product-content",
    "#tab-description",
    ".woocommerce-Tabs-panel--description",
    ".product .elementor-section",
  ];

  let fullText = "";
  for (const sel of contentSelectors) {
    const t = clean($(sel).text());
    if (t.length > fullText.length) fullText = t;
  }

  // ── Split into description vs dosage sections ──────────────────────────────
  // Dosage section: everything after "DOSAGE" or "ADMINISTRATION" heading
  const dosageMatch = fullText.match(/DOSAGE\s*(?:AND\s*ADMINISTRATION)?[:\s]+([\s\S]+?)(?=PACKAGING|WITHDRAWAL|PRECAUTION|STORAGE|$)/i);
  const dosage = dosageMatch ? clean(dosageMatch[1]).substring(0, 1500) : "";

  // Description: COMPOSITION + INDICATIONS + BENEFITS (everything before DOSAGE)
  const beforeDosage = dosageMatch
    ? fullText.slice(0, fullText.search(/DOSAGE\s*(?:AND\s*ADMINISTRATION)?/i))
    : fullText;
  const description = clean(beforeDosage).substring(0, 3000);

  // ── Packaging → variant size ───────────────────────────────────────────────
  // Look for "PACKAGING:" section: e.g. "500g pouch", "1kg bag", "100ml bottle"
  const packagingMatch = fullText.match(/PACKAGING[:\s]+([\s\S]+?)(?=\n\n|COMPOSITION|INDICATION|DOSAGE|WITHDRAWAL|STORAGE|$)/i);
  const variants: ExtractedVariant[] = [];

  if (packagingMatch) {
    const packText = packagingMatch[1];
    // Extract individual pack sizes: "500g", "1kg", "100ml x 10", "1 liter" etc.
    const sizeMatches = packText.match(/[\d.,]+\s*(?:g|gm|grams?|kg|ml|liter|litre|L|mg|oz|lb|pouch|bottle|sachet|vial|tab|tablet|capsule|strip|pack)[^\n,;]*/gi) || [];
    for (const size of sizeMatches) {
      variants.push({ packingVolume: clean(size), customerPrice: apiPrice });
    }
  }

  // Also check for WooCommerce variation JSON (some products might be variable)
  const variationAttr = $("form.variations_form").attr("data-product_variations") || "";
  if (variationAttr && variationAttr !== "false") {
    try {
      const variations = JSON.parse(variationAttr);
      if (Array.isArray(variations) && variations.length) {
        variants.length = 0; // replace packaging-derived variants
        for (const v of variations) {
          const label = Object.values(v.attributes || {}).filter(Boolean).join(" / ");
          const vPrice = v.display_price != null ? String(Math.round(v.display_price)) : apiPrice;
          variants.push({ packingVolume: label as string, customerPrice: vPrice });
        }
      }
    } catch { /* skip */ }
  }

  if (!variants.length) variants.push({ packingVolume: "", customerPrice: apiPrice });

  console.log(`[DETAIL] img=${imageUrl ? "✓" : "✗"} desc=${description.length}c dosage=${dosage.length}c variants=${variants.length}`);

  return { imageUrl, description, dosage, variants };
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
    const catIndex = pathParts.indexOf("product-category");
    const categorySlug = catIndex >= 0 ? pathParts[catIndex + 1] : pathParts[pathParts.length - 1] || undefined;

    console.log(`[VETSHOP] origin=${origin}, category=${categorySlug}`);

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
        const apiPrice = p.variants[0]?.customerPrice || "";
        const detail = parseDetailPage(h, p.productLink, apiPrice);
        return {
          ...p,
          imageUrl:    isImageUrl(detail.imageUrl || "") ? detail.imageUrl! : p.imageUrl,
          description: detail.description || p.description,
          dosage:      detail.dosage      || p.dosage,
          variants:    detail.variants?.length ? detail.variants : p.variants,
        } as ExtractedProduct;
      }));
      results.forEach(r => enriched.push(r));
      console.log(`[VETSHOP] batch ${Math.floor(i / 3) + 1}, total: ${enriched.length}`);
    }

    return NextResponse.json({ success: true, count: enriched.length, totalLinks: enriched.length, products: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Scraping failed" }, { status: 500 });
  }
}
