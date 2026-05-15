import { NextRequest } from "next/server";
import * as cheerio from "cheerio";
import axios from "axios";
import https from "https";

export const maxDuration = 120;

export interface ExtractedVariant { packingVolume: string; customerPrice: string; }
export interface ExtractedProduct {
  productName: string; genericName: string;
  category: string; subCategory: string; subsubCategory: string; productType: string;
  description: string; dosage: string;
  productLink: string; imageUrl: string; outofstock: boolean;
  variants: ExtractedVariant[];
}

const clean = (s: string) => (s || "").replace(/\s+/g, " ").trim();
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

async function fetchText(url: string): Promise<string | null> {
  try {
    const r = await axios.get(url, {
      headers: HEADERS, timeout: 20000, httpsAgent,
      maxRedirects: 5, responseType: "text", validateStatus: s => s < 500,
    });
    return r.status >= 400 ? null : String(r.data);
  } catch { return null; }
}

async function fetchJson(url: string): Promise<any> {
  try {
    const r = await axios.get(url, {
      headers: { ...HEADERS, Accept: "application/json" },
      timeout: 15000, httpsAgent, maxRedirects: 5, validateStatus: s => s < 500,
    });
    return r.status >= 400 ? null : r.data;
  } catch { return null; }
}

// ── Find variant price map by scanning raw HTML for "variants":[...] ─────────
function extractVariantPricesFromHtml(html: string): Map<string, string> {
  const map = new Map<string, string>();
  let searchFrom = 0;

  while (searchFrom < html.length) {
    const idx = html.indexOf('"variants"', searchFrom);
    if (idx === -1) break;
    searchFrom = idx + 10;

    const bracketIdx = html.indexOf('[', idx + 10);
    if (bracketIdx === -1 || bracketIdx > idx + 30) continue;

    // Extract array content by counting brackets
    let depth = 0, end = -1;
    for (let i = bracketIdx; i < Math.min(html.length, bracketIdx + 200000); i++) {
      if (html[i] === '[' || html[i] === '{') depth++;
      else if (html[i] === ']' || html[i] === '}') {
        depth--;
        if (depth === 0 && html[i] === ']') { end = i; break; }
      }
    }
    if (end === -1) continue;

    try {
      const arr = JSON.parse(html.slice(bracketIdx, end + 1));
      if (!Array.isArray(arr) || arr.length === 0) continue;
      const first = arr[0];
      if (!first || typeof first !== "object") continue;
      // Only use arrays where items have a price field
      if (!("price" in first) && !("prices" in first) && !("retailPrice" in first)) continue;

      for (const v of arr) {
        const title = ((v.title || v.name || "") as string).replace(/\s+/g, " ").trim();
        if (!title || /^default\s*title$/i.test(title)) continue;
        const raw = v.price ?? v.prices?.price?.value ?? v.retailPrice ?? v.display_price;
        if (raw == null) continue;
        const num = parseFloat(String(raw));
        if (isNaN(num) || num <= 0) continue;
        // Shopify themes store price as integer cents (11900 = AED 119)
        const price = (num > 500 && Number.isInteger(num))
          ? String(Math.round(num / 100))
          : String(Math.round(num));
        const key = title.toLowerCase().replace(/\s+/g, "");
        if (!map.has(key)) map.set(key, price);
      }

      if (map.size > 0) return map; // Use first valid variants array found
    } catch {}
  }

  return map;
}

// ── Extract per-variant prices from __NEXT_DATA__ ────────────────────────────
function extractVariantsFromNextData(obj: any, depth = 0): Array<{ title: string; price: string }> {
  if (!obj || typeof obj !== "object" || depth > 20) return [];

  // Direct variants array with price fields
  if ("variants" in obj) {
    const v = obj.variants;
    if (Array.isArray(v) && v.length > 0) {
      const first = v[0];
      const hasPriceField = first && typeof first === "object" &&
        ("price" in first || "prices" in first || "retailPrice" in first || "calculated_price" in first);
      if (hasPriceField) {
        const result: Array<{ title: string; price: string }> = [];
        for (const variant of v) {
          const title = clean(variant.title || variant.name || variant.sku || "");
          if (!title || /^default\s*title$/i.test(title)) continue;
          const pv = variant.price?.value ?? variant.prices?.price?.value
            ?? variant.retailPrice ?? variant.calculated_price ?? variant.price;
          if (pv != null) result.push({ title, price: String(Math.round(parseFloat(String(pv)))) });
        }
        if (result.length > 0) return result;
      }
    }
    // GraphQL edges/nodes pattern (BigCommerce)
    if (v?.edges && Array.isArray(v.edges)) {
      const result: Array<{ title: string; price: string }> = [];
      for (const edge of v.edges) {
        const node = edge?.node;
        if (!node) continue;
        const pv = node.prices?.price?.value ?? node.price?.value ?? node.retailPrice;
        let title = node.name || node.sku || "";
        // Extract option labels if no plain name
        const optEdges = node.productOptions?.edges || node.selectedOptions;
        if (!title && Array.isArray(optEdges)) {
          title = optEdges.map((e: any) => e?.node?.values?.edges?.[0]?.node?.label || e?.value || "").filter(Boolean).join(" / ");
        }
        if (title && pv != null) result.push({ title: clean(title), price: String(Math.round(parseFloat(String(pv)))) });
      }
      if (result.length > 0) return result;
    }
  }

  // Recurse into object keys (prioritise keys named "product", "data", "pageProps")
  const priorityKeys = ["pageProps", "data", "product"];
  for (const key of [...priorityKeys, ...Object.keys(obj).filter(k => !priorityKeys.includes(k))]) {
    if (!obj[key] || typeof obj[key] !== "object") continue;
    if (["query", "buildId", "err", "__N_SSP"].includes(key)) continue;
    const found = extractVariantsFromNextData(obj[key], depth + 1);
    if (found.length > 0) return found;
  }
  return [];
}

// ── Parse sitemap-products.xml → array of product URLs ───────────────────────
function parseSitemap(xml: string): string[] {
  const urls: string[] = [];
  const re = /<loc>(https?:\/\/[^<]+\/products\/[^<]+)<\/loc>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) urls.push(m[1].trim());
  return urls;
}

// ── Parse one product detail page ────────────────────────────────────────────
function parseProduct(html: string, url: string, shopifyProduct?: any): ExtractedProduct | null {
  const $ = cheerio.load(html);

  // Name
  const name = clean($("h1").first().text());
  if (!name) return null;

  // ── Parse all JSON-LD in one pass (image + description + per-variant offers) ─
  let imageUrl = "";
  let description = "";
  const ldOffers: Array<{ name: string; price: string; inStock: boolean }> = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const ld = JSON.parse($(el).html() || "");
      const node: any = ld["@type"] === "Product" ? ld
        : Array.isArray(ld["@graph"]) ? (ld["@graph"] as any[]).find((n: any) => n["@type"] === "Product") : null;
      if (!node) return;

      // Image
      if (!imageUrl) {
        const img = node.image;
        if (typeof img === "string") imageUrl = img;
        else if (Array.isArray(img) && img[0]) imageUrl = typeof img[0] === "string" ? img[0] : (img[0].url || "");
        else if (img?.url) imageUrl = String(img.url);
      }

      // Description
      if (!description && node.description) {
        description = clean(String(node.description)).substring(0, 3000);
      }

      // Per-variant offers — extract variant name from offer URL query params (e.g. ?Size=800G)
      const offers = Array.isArray(node.offers) ? node.offers : (node.offers ? [node.offers] : []);
      for (const o of offers) {
        if (o["@type"] === "Offer" && o.price != null) {
          const p = parseFloat(String(o.price));
          if (isNaN(p)) continue;

          let offerName = clean(o.name || "");
          if (!offerName && o.url) {
            try {
              const oUrl = new URL(String(o.url));
              // Prefer size/weight/volume param
              const sz = oUrl.searchParams.get("Size") || oUrl.searchParams.get("size")
                || oUrl.searchParams.get("Weight") || oUrl.searchParams.get("weight")
                || oUrl.searchParams.get("Volume") || oUrl.searchParams.get("volume")
                || oUrl.searchParams.get("Pack") || oUrl.searchParams.get("pack");
              if (sz) {
                offerName = sz;
              } else {
                // Skip colour/flavour-only params, use anything else
                for (const [k, v] of oUrl.searchParams) {
                  if (!/colour|color|flavou?r/i.test(k)) { offerName = v; break; }
                }
              }
            } catch {}
          }
          if (!offerName) offerName = clean(o.sku || "");

          const inStock = /InStock/i.test(String(o.availability || ""));
          ldOffers.push({ name: offerName, price: String(Math.round(p)), inStock });
        }
      }
    } catch {}
  });

  // og:image / CDN fallbacks
  if (!imageUrl) {
    imageUrl = $('meta[property="og:image"]').attr("content") ||
               $('meta[name="og:image"]').attr("content") || "";
  }
  if (!imageUrl) {
    $('img[src*="cdn.shopify.com"][src*="/products/"], img[data-src*="cdn.shopify.com"][data-src*="/products/"]').each((_, el) => {
      if (imageUrl) return;
      imageUrl = $(el).attr("src") || $(el).attr("data-src") || "";
    });
  }
  if (imageUrl.startsWith("//")) imageUrl = "https:" + imageUrl;

  // ── Fallback price from first AED match ───────────────────────────────────
  let fallbackPrice = "";
  const priceMatch = html.match(/AED\s*([\d,]+(?:\.\d+)?)/);
  if (priceMatch) fallbackPrice = String(Math.round(parseFloat(priceMatch[1].replace(/,/g, ""))));

  // ── Variants ──────────────────────────────────────────────────────────────
  const variants: ExtractedVariant[] = [];

  // Priority 1: Shopify product JSON API — exact per-variant prices
  if (shopifyProduct?.variants?.length) {
    for (const v of shopifyProduct.variants) {
      const title = clean(v.title || "");
      const varPrice = v.price ? String(Math.round(parseFloat(v.price))) : fallbackPrice;
      if (/^default title$/i.test(title)) {
        variants.push({ packingVolume: "", customerPrice: varPrice });
      } else {
        variants.push({ packingVolume: title, customerPrice: varPrice });
      }
    }
  }

  // Priority 1.5: JSON-LD per-variant offers (names extracted from offer URL query params)
  if (!variants.length && ldOffers.length > 0) {
    const named = ldOffers.filter(o => o.name);
    if (named.length > 1) {
      for (const o of named) variants.push({ packingVolume: o.name, customerPrice: o.price });
    } else if (named.length === 1) {
      variants.push({ packingVolume: named[0].name, customerPrice: named[0].price });
    } else if (ldOffers.length === 1) {
      variants.push({ packingVolume: "", customerPrice: ldOffers[0].price });
    }
  }

  // Priority 2: scan raw HTML for any "variants":[...] JSON (catches __NEXT_DATA__, theme JSON, etc.)
  if (!variants.length) {
    const priceMap = extractVariantPricesFromHtml(html);
    if (priceMap.size > 0) {
      // Use price map to enrich size buttons, or use the map entries directly as variants
      const sizeRe = /^\s*\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|lb|oz|gm|grams?|litre?s?|pack|pc|pcs|pieces?|count|tabs?|capsules?)\s*(?:x\s*\d+)?\s*$/i;
      const sizeButtons: string[] = [];
      $("button, [role='button'], li, option").each((_, el) => {
        const txt = clean($(el).text());
        if (sizeRe.test(txt) && txt.length < 30 && !sizeButtons.some(s => s.toLowerCase() === txt.toLowerCase())) {
          sizeButtons.push(txt);
        }
      });

      if (sizeButtons.length > 0) {
        for (const size of sizeButtons) {
          const norm = size.toLowerCase().replace(/\s+/g, "");
          const mappedPrice = priceMap.get(norm)
            || [...priceMap.entries()].find(([k]) => k.includes(norm) || norm.includes(k))?.[1]
            || fallbackPrice;
          variants.push({ packingVolume: size, customerPrice: mappedPrice });
        }
      } else {
        for (const [title, price] of priceMap) {
          variants.push({ packingVolume: title, customerPrice: price });
        }
      }
    }
  }

  // Priority 3: __NEXT_DATA__ structured extraction
  if (!variants.length) {
    let ndVariants: Array<{ title: string; price: string }> = [];
    const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (ndMatch) {
      try { ndVariants = extractVariantsFromNextData(JSON.parse(ndMatch[1])); } catch {}
    }
    for (const v of ndVariants) {
      if (!v.title || /^default/i.test(v.title)) continue;
      variants.push({ packingVolume: v.title, customerPrice: v.price });
    }
  }

  // Priority 4: size buttons with JSON-LD offer matching (original fallback)
  if (!variants.length) {
    const sizeRe = /^\s*\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|lb|oz|gm|grams?|litre?s?|pack|pc|pcs|pieces?|count|tabs?|capsules?)\s*(?:x\s*\d+)?\s*$/i;
    const sizeButtons: string[] = [];
    $("button, [role='button'], li, option").each((_, el) => {
      const txt = clean($(el).text());
      if (sizeRe.test(txt) && txt.length < 30 && !sizeButtons.some(s => s.toLowerCase() === txt.toLowerCase())) {
        sizeButtons.push(txt);
      }
    });
    for (const size of sizeButtons) {
      const norm = size.toLowerCase().replace(/\s+/g, "");
      const ldHit = ldOffers.find(o => o.name.toLowerCase().replace(/\s+/g, "").includes(norm));
      variants.push({ packingVolume: size, customerPrice: ldHit?.price || fallbackPrice });
    }
    if (!variants.length && ldOffers.length > 1) {
      for (const o of ldOffers) {
        if (o.name) variants.push({ packingVolume: o.name, customerPrice: o.price });
      }
    }
  }

  if (!variants.length) variants.push({ packingVolume: "", customerPrice: fallbackPrice });

  // Use enriched description/image from Shopify API if HTML extraction missed them
  if (!description && shopifyProduct?.body_html) {
    description = clean(cheerio.load(shopifyProduct.body_html).text()).substring(0, 3000);
  }
  if (!imageUrl && shopifyProduct?.images?.[0]?.src) {
    imageUrl = shopifyProduct.images[0].src;
    if (imageUrl.startsWith("//")) imageUrl = "https:" + imageUrl;
  }

  // ── Description fallbacks ─────────────────────────────────────────────────

  // Text-based: extract between "Product Description" heading and next section
  if (!description) {
    $("script, style, noscript").remove();
    const bodyText = clean($("body").text());
    const idx = bodyText.search(/Product\s+Description/i);
    if (idx >= 0) {
      let chunk = bodyText.slice(idx).replace(/^Product\s+Description\s*/i, "").trimStart();
      if (chunk.toLowerCase().startsWith(name.toLowerCase())) {
        chunk = chunk.slice(name.length).trimStart();
      }
      const cutoff = chunk.search(/Nutritional\s+Info|Feeding\s+Instructions?|Technical\s+details|Ingredients\s*[-–—]/i);
      if (cutoff > 50) chunk = chunk.slice(0, cutoff);
      if (chunk.length > 80) description = clean(chunk).substring(0, 3000);
    }
  }

  // 3. Specific CSS selectors (no broad class* wildcards that match the full page)
  if (!description) {
    $("nav, header, footer").remove();
    const descEl = $(
      ".product__description, .product-description, #description, #tab-description, " +
      "[data-tab-content='description'], [data-product-description]"
    ).first();
    if (descEl.length) description = clean(descEl.text()).substring(0, 3000);
  }

  // 4. Longest <p> fallback
  if (!description) {
    let longest = "";
    $("p").each((_, el) => {
      const t = clean($(el).text());
      if (t.length > longest.length && t.length > 100) longest = t;
    });
    description = longest.substring(0, 3000);
  }

  // ── Category ──────────────────────────────────────────────────────────────
  const category = clean(
    $("[class*='breadcrumb'] a, [class*='Breadcrumb'] a").last().text() ||
    $('meta[property="product:category"]').attr("content") || ""
  );

  const outofstock = ldOffers.length > 0
    ? ldOffers.every(o => !o.inStock)
    : /out.of.stock|sold.out|unavailable/i.test(html);

  return {
    productName: name, genericName: "",
    category, subCategory: "", subsubCategory: "", productType: "",
    description, dosage: "",
    productLink: url, imageUrl, outofstock, variants,
  };
}

function sseEvent(enc: TextEncoder, data: object) {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

const PAGE_SIZE = 48;

export async function POST(req: NextRequest) {
  const { url, page = 1 } = await req.json().catch(() => ({}));
  if (!url) return new Response(JSON.stringify({ error: "URL required" }), { status: 400 });

  let origin: string;
  try { origin = new URL(url).origin; } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400 });
  }

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (d: object) => { try { controller.enqueue(sseEvent(enc, d)); } catch {} };

      try {
        // ── Step 1: fetch sitemap ────────────────────────────────────────────
        send({ type: "status", message: "Loading product catalog from sitemap…" });

        const sitemapXml = await fetchText(`${origin}/sitemap-products.xml`);
        if (!sitemapXml) {
          send({ type: "error", message: "Could not load the product sitemap." });
          controller.close(); return;
        }

        const allUrls = parseSitemap(sitemapXml);
        if (!allUrls.length) {
          send({ type: "error", message: "No products found in sitemap." });
          controller.close(); return;
        }

        const totalPages = Math.ceil(allUrls.length / PAGE_SIZE);
        const pageUrls = allUrls.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

        send({ type: "total", total: pageUrls.length });
        send({ type: "page_info", currentPage: page, totalPages, totalCount: allUrls.length });

        // ── Step 2: scrape each product detail page in batches of 4 ─────────
        for (let i = 0; i < pageUrls.length; i += 4) {
          const batch = pageUrls.slice(i, i + 4);
          const results = await Promise.all(batch.map(async (pUrl) => {
            // Fetch HTML and Shopify product JSON in parallel
            const [html, shopifyData] = await Promise.all([
              fetchText(pUrl),
              fetchJson(`${pUrl}.json`),
            ]);
            return html ? parseProduct(html, pUrl, shopifyData?.product) : null;
          }));
          for (const p of results) if (p) send({ type: "product", product: p });
        }

        if (page < totalPages) send({ type: "next_page", url, page: page + 1 });
        send({ type: "done" });
      } catch (e: any) {
        send({ type: "error", message: e.message || "Scraping failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
  });
}
