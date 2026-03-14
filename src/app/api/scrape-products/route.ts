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
const dedupCSV = (s: string) =>
  [...new Set(s.split(",").map(clean).filter(Boolean))].join(", ");

function resolveUrl(base: string, href: string): string {
  if (!href) return "";
  if (href.startsWith("http") || href.startsWith("//")) {
    return href.startsWith("//") ? "https:" + href : href;
  }
  try { return new URL(href, base).href; } catch { return href; }
}

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function fetchHtml(url: string): Promise<string | null> {
  console.log(`\n[FETCH] → ${url}`);
  try {
    const res = await axios.get(url, {
      headers: HEADERS,
      timeout: 15000,
      httpsAgent,
      maxRedirects: 5,
      responseType: "text",
      validateStatus: (s) => s < 500,
    });
    console.log(`[FETCH] ← status: ${res.status}`);
    if (res.status >= 400) {
      console.log(`[FETCH] ✗ Failed — status ${res.status}`);
      return null;
    }
    const html = typeof res.data === "string" ? res.data : String(res.data);
    console.log(`[FETCH] ✓ Got ${html.length} chars of HTML`);
    return html;
  } catch (e: any) {
    const cause = e.cause?.message || e.cause?.code || "";
    console.log(`[FETCH] ✗ Exception: ${e.message} ${cause ? `| cause: ${cause}` : ""} | code: ${e.code || ""}`);
    return null;
  }
}

function getProductLinks(html: string, origin: string, currentPath: string): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const links: string[] = [];
  const skipped: Record<string, number> = {};

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const full = resolveUrl(origin, href);
    try {
      const u = new URL(full);
      const p = u.pathname;

      // Must be same origin
      if (u.origin !== origin) { skipped["different-origin"] = (skipped["different-origin"] || 0) + 1; return; }
      // Skip non-shop top-level paths (web, website, page, etc.)
      if (/^\/(web|website|page|pages|blog|news|about|contact|faq|terms|privacy)\b/i.test(p)) {
        skipped["non-shop"] = (skipped["non-shop"] || 0) + 1; return;
      }
      // Skip utility pages
      if (/\/(cart|checkout|wishlist|account|search|login|register|compare|tag|brands|change_pricelist|reset_password)\b/i.test(p)) {
        skipped["utility-page"] = (skipped["utility-page"] || 0) + 1; return;
      }
      // Skip pagination/filter params
      if (u.search.includes("page=") || u.search.includes("attribute_values=")) {
        skipped["pagination"] = (skipped["pagination"] || 0) + 1; return;
      }
      // Skip current page
      if (p === currentPath) { skipped["current-page"] = (skipped["current-page"] || 0) + 1; return; }
      // Must have at least 2 path segments (not just the homepage)
      if (p.split("/").filter(Boolean).length < 2) { skipped["too-short"] = (skipped["too-short"] || 0) + 1; return; }
      // Skip pure category index pages
      if (/\/category\/[^/]+\/?$/.test(p)) { skipped["category-index"] = (skipped["category-index"] || 0) + 1; return; }

      const key = `${u.origin}${p}`;
      if (!seen.has(key)) { seen.add(key); links.push(key); }
    } catch { skipped["parse-error"] = (skipped["parse-error"] || 0) + 1; }
  });

  console.log(`\n[LINKS] Found ${links.length} candidate product links`);
  console.log(`[LINKS] Skipped breakdown:`, skipped);
  console.log(`[LINKS] First 10 links:`);
  links.slice(0, 10).forEach((l, i) => console.log(`  [${i + 1}] ${l}`));

  return links;
}

// ── Extract prices from listing page (Odoo / generic) ────────────────────────
function extractListingPrices(html: string, origin: string): Map<string, string> {
  const $ = cheerio.load(html);
  const priceMap = new Map<string, string>(); // productUrl → price

  // Odoo product grid cards
  $(".oe_product_cart, .o_wsale_product_grid_wrapper .o_wsale_product, [class*='product_item'], .product-item, .product-card").each((_, card) => {
    const link = $(card).find("a[href]").first().attr("href") || "";
    if (!link) return;
    const url = resolveUrl(origin, link);
    const priceRaw = $(card).find(".oe_currency_value, .product_price, .price, [class*='price']").first().text();
    const price = clean(priceRaw).replace(/[^\d.]/g, "");
    if (url && price && parseFloat(price) > 0) {
      priceMap.set(url, price);
      console.log(`[LISTING PRICE] ${url} → ${price}`);
    }
  });

  // Fallback: parse "Retail Price: X.X" text blocks (Odoo B2B list view)
  // Look for product link + nearby price text
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const full = resolveUrl(origin, href);
    if (!full.startsWith(origin) || priceMap.has(full)) return;
    // Check parent/nearby text for price pattern
    const parentText = clean($(el).closest("li, div, article, tr").text());
    const m = parentText.match(/(?:retail\s*price|price)[^\d]*(\d[\d.,]+)/i);
    if (m) {
      const price = m[1].replace(/,/g, "");
      if (parseFloat(price) > 0) {
        priceMap.set(full, price);
        console.log(`[LISTING PRICE text] ${full} → ${price}`);
      }
    }
  });

  console.log(`[LISTING PRICE] Total prices found from listing: ${priceMap.size}`);
  return priceMap;
}

// ── Grok AI extraction ─────────────────────────────────────────────────────────
async function extractWithGrok(html: string, url: string): Promise<Partial<ExtractedProduct> | null> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    console.log(`[GROK] ✗ GROK_API_KEY not set — skipping AI extraction`);
    return null;
  }

  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, noscript, svg, iframe, link").remove();
  const bodyText = clean($("body").text()).substring(0, 8000);
  const mainHtml = ($(".product, #product, [class*='product'], main, article").first().html() || $("body").html() || "").substring(0, 6000);

  console.log(`[GROK] Sending to Grok — bodyText: ${bodyText.length} chars, mainHtml: ${mainHtml.length} chars`);
  console.log(`[GROK] Body text preview: ${bodyText.substring(0, 300)}...`);

  const prompt = `You are a product data extractor for a pet/animal products e-commerce site.

Analyze the following product page content and extract structured data. Return ONLY a valid JSON object — no markdown, no explanation.

Required JSON format:
{
  "productName": "full product name",
  "genericName": "brand name or manufacturer name",
  "category": "main animal/product category e.g. Dog Food, Cat Supplements, Bird Toys",
  "subCategory": "more specific sub-category e.g. Dry Food, Wet Food, Treats, Shampoo",
  "subsubCategory": "even more specific e.g. Grain Free, Hypoallergenic, Senior",
  "productType": "form of product e.g. Dry, Wet, Liquid, Tablet, Powder, Spray",
  "description": "full product description, include ingredients if present, analytical constituents if present",
  "dosage": "feeding instructions or dosage guidelines, empty string if not found",
  "outofstock": false,
  "variants": [
    {"packingVolume": "size or weight e.g. 1kg, 400g, 6x85g", "customerPrice": "numeric price string only e.g. 12.99"}
  ]
}

Rules:
- outofstock should be true ONLY if the page explicitly says out of stock / unavailable
- variants must be an array, even if only one size/price exists
- customerPrice must be a plain number string with no currency symbols
- If a field cannot be determined, use an empty string ""
- description should be comprehensive — merge product description + ingredients + nutritional info

Page URL: ${url}

Page text:
${bodyText}

Main product HTML:
${mainHtml}`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 2000,
      }),
      signal: AbortSignal.timeout(25000),
    });

    console.log(`[GROK] API response status: ${res.status}`);
    if (!res.ok) {
      const errText = await res.text();
      console.log(`[GROK] ✗ API error: ${errText}`);
      return null;
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content || "";
    console.log(`[GROK] Raw response:\n${content}`);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`[GROK] ✗ No JSON found in response`);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`[GROK] ✓ Parsed result:`, JSON.stringify(parsed, null, 2));

    if (Array.isArray(parsed.variants)) {
      parsed.variants = parsed.variants
        .map((v: any) => ({
          packingVolume: clean(String(v.packingVolume || "")),
          customerPrice: String(v.customerPrice || "").replace(/[^\d.]/g, ""),
        }))
        .filter((v: ExtractedVariant) => v.customerPrice);
    }

    return parsed;
  } catch (e: any) {
    console.log(`[GROK] ✗ Exception: ${e.message}`);
    return null;
  }
}

// ── Cheerio fallback extraction ────────────────────────────────────────────────
function parseProductCheerio(html: string, url: string, listingPrice?: string): ExtractedProduct | null {
  console.log(`\n[CHEERIO] Parsing: ${url}`);

  const $raw = cheerio.load(html);
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, noscript").remove();

  const origin = new URL(url).origin;

  let name = "", currency = "", availability = "", ldDesc = "", imageUrl = "", price = "";
  const ldVariants: ExtractedVariant[] = [];
  let breadcrumb: string[] = [];
  let ldScriptCount = 0;

  $raw('script[type="application/ld+json"]').each((_, el) => {
    ldScriptCount++;
    const raw = $raw(el).html() || "{}";
    console.log(`[CHEERIO] JSON-LD script #${ldScriptCount} (${raw.length} chars): ${raw.substring(0, 200)}...`);
    try {
      const json = JSON.parse(raw);
      (Array.isArray(json) ? json : [json]).forEach((item: any) => {
        console.log(`[CHEERIO]   @type = ${item["@type"]}`);
        if (item["@type"] === "BreadcrumbList") {
          breadcrumb = (item.itemListElement || [])
            .sort((a: any, b: any) => a.position - b.position)
            .map((c: any) => c.name as string)
            .filter((n: string) => n && n !== "All Products");
          console.log(`[CHEERIO]   Breadcrumb: ${breadcrumb.join(" > ")}`);
        }
        if (item["@type"] === "ProductGroup") {
          if (!name) name = item.name || "";
          if (!imageUrl) { const i = item.image; imageUrl = Array.isArray(i) ? i[0] : i || ""; }
          (item.hasVariant || []).forEach((v: any) => {
            const o = Array.isArray(v.offers) ? v.offers[0] : v.offers || {};
            if (!currency) currency = o.priceCurrency || "";
            if (!availability) availability = (o.availability || "").replace("https://schema.org/", "");
            if (!ldDesc) ldDesc = v.description || "";
            const label = (v.name || "").replace(name, "").replace(/[()]/g, "").trim();
            ldVariants.push({ packingVolume: label || v.name || "", customerPrice: o.price != null ? String(o.price) : "" });
            if (!price) price = o.price != null ? String(o.price) : "";
          });
          console.log(`[CHEERIO]   ProductGroup: name="${name}", variants=${ldVariants.length}`);
        }
        if (item["@type"] === "Product") {
          if (!name) name = item.name || "";
          if (!imageUrl) { const i = item.image; imageUrl = Array.isArray(i) ? i[0] : i || ""; }
          const o = Array.isArray(item.offers) ? item.offers[0] : item.offers || {};
          if (!price) price = o.price != null ? String(o.price) : "";
          if (!currency) currency = o.priceCurrency || "";
          if (!availability) availability = (o.availability || "").replace("https://schema.org/", "");
          if (!ldDesc && item.description && !/^\d+$/.test(item.description.trim())) ldDesc = item.description;
          console.log(`[CHEERIO]   Product: name="${name}", price="${price}", currency="${currency}", availability="${availability}"`);
        }
      });
    } catch (e: any) {
      console.log(`[CHEERIO]   ✗ JSON-LD parse error: ${e.message}`);
    }
  });

  console.log(`[CHEERIO] Total JSON-LD scripts: ${ldScriptCount}`);

  const productName = name || clean($("h1").first().text()) || clean($('meta[property="og:title"]').attr("content") || "");
  console.log(`[CHEERIO] productName: "${productName}"`);
  console.log(`[CHEERIO] price: "${price}", currency: "${currency}"`);
  console.log(`[CHEERIO] availability: "${availability}"`);
  console.log(`[CHEERIO] imageUrl from LD: "${imageUrl}"`);
  console.log(`[CHEERIO] ldVariants (${ldVariants.length}):`, ldVariants);

  if (!productName) {
    console.log(`[CHEERIO] ✗ No product name found — skipping`);
    return null;
  }

  const cats = breadcrumb.filter(c => c !== productName);
  const category       = cats[0] || "";
  const subCategory    = cats[1] || "";
  const subsubCategory = cats[2] || "";

  const ogImage = $('meta[property="og:image"]').attr("content") || "";
  const image = resolveUrl(origin, imageUrl) || resolveUrl(origin, ogImage);
  console.log(`[CHEERIO] og:image: "${ogImage}", resolved image: "${image}"`);

  // Attribute extraction
  const attrs = new Map<string, string>();
  const addAttr = (k: string, v: string) => {
    k = clean(k); v = clean(v);
    if (!k || !v || k.length > 100 || k === v) return;
    if (!attrs.has(k) || v.length > (attrs.get(k) || "").length) attrs.set(k, v);
  };

  $(["h5","h6"].join(",")).each((_, el) => {
    const key = clean($(el).text());
    if (!key || key.length > 80) return;
    const val = clean($(el).next().text()) || clean($(el).parent().next().first().text());
    if (val) addAttr(key, val);
  });
  $("table tr").each((_, row) => {
    const cells = $(row).find("td, th");
    if (cells.length >= 2) addAttr(cells.eq(0).text(), cells.eq(1).text());
  });
  $("dl dt").each((_, dt) => addAttr($(dt).text(), $(dt).next("dd").text()));
  $(".product_attributes, #product_attributes, .o_product_page_content").find("li, p").each((_, el) => {
    if ($(el).children().length > 2) return;
    const m = clean($(el).text()).match(/^([^:]{2,60}):\s*(.{1,800})$/);
    if (m) addAttr(m[1], m[2]);
  });

  console.log(`[CHEERIO] Attributes found (${attrs.size}):`, Object.fromEntries(attrs));

  const pull = (...keys: string[]): string => {
    for (const k of keys) {
      for (const [ak, av] of attrs) {
        if (ak.toLowerCase() === k.toLowerCase() || ak.toLowerCase().includes(k.toLowerCase())) {
          attrs.delete(ak);
          return dedupCSV(av);
        }
      }
    }
    return "";
  };

  const genericName  = pull("Brand", "Manufacturer");
  const productType  = pull("Food Type", "Product Type", "Form", "Formulation");
  const dosage       = pull("Feeding Instructions", "Feeding Guide", "Dosage", "Feeding");
  const ingredients  = pull("Ingredients");
  const analytical   = pull("Analytical Constituents", "Guaranteed Analysis", "Nutritional Analysis");
  const additives    = pull("Additives");

  console.log(`[CHEERIO] Pulled fields — genericName:"${genericName}" productType:"${productType}" dosage:"${dosage.substring(0,60)}"`);
  console.log(`[CHEERIO] ingredients: ${ingredients.substring(0,80)}`);

  pull("Size", "Weight", "Pack Size", "Pet Type", "Age Group", "Breed",
       "Made In Country", "Made In", "Life Stage", "Diet Type", "SKU", "Barcode");

  // Use any remaining long-value attrs as description (e.g. Odoo product detail blocks)
  const remainingDesc = [...attrs.values()]
    .filter(v => v.length > 40)
    .join("\n\n");

  const descParts: string[] = [];
  // Filter out pure-numeric og:description (barcodes)
  const ogDesc = clean($('meta[property="og:description"]').attr("content") || "");
  const baseDesc = ldDesc || (!/^\d+$/.test(ogDesc) ? ogDesc : "");
  if (baseDesc) descParts.push(baseDesc);
  else if (remainingDesc) descParts.push(remainingDesc);  // fallback: use page attributes
  if (ingredients) descParts.push(`Ingredients: ${ingredients}`);
  if (analytical)  descParts.push(`Analytical Constituents: ${analytical}`);
  if (additives)   descParts.push(`Additives: ${additives}`);
  const description = descParts.join("\n\n").substring(0, 2000);

  console.log(`[CHEERIO] description (${description.length} chars): ${description.substring(0, 100)}...`);

  // Try to find price in HTML if JSON-LD gave nothing
  if (!price) {
    const priceSelectors = [
      ".product_price .oe_price .oe_currency_value",
      ".oe_price .oe_currency_value",
      "[itemprop='price']",
      ".price_unit",
      ".product-price",
      ".price",
    ];
    for (const sel of priceSelectors) {
      const raw = clean($(sel).first().text()).replace(/[^\d.]/g, "");
      if (raw && parseFloat(raw) > 0) { price = raw; console.log(`[CHEERIO] Price found via CSS "${sel}": ${price}`); break; }
    }
  }

  // Use listing page price as last resort
  if (!price && listingPrice) {
    price = listingPrice;
    console.log(`[CHEERIO] Using listing page price fallback: ${price}`);
  }

  let variants: ExtractedVariant[] = ldVariants;
  if (!variants.length && price) {
    const sizeHint = productName.match(/[\d.]+\s*(?:kg|g|lbs?|oz|ml|l)\b/i)?.[0] || "";
    variants = [{ packingVolume: sizeHint, customerPrice: price }];
  }
  variants = variants.map(v => ({
    packingVolume: clean(v.packingVolume),
    customerPrice: v.customerPrice.replace(/[^\d.]/g, ""),
  })).filter(v => v.customerPrice);

  console.log(`[CHEERIO] Final variants (${variants.length}):`, variants);

  const result: ExtractedProduct = {
    productName: clean(productName),
    genericName, category, subCategory, subsubCategory, productType,
    description, dosage,
    productLink: url,
    imageUrl: image,
    outofstock: /OutOfStock|out.?of.?stock/i.test(availability),
    variants,
  };

  console.log(`[CHEERIO] ✓ Final product:`, JSON.stringify(result, null, 2));
  return result;
}

// ── Main product parser (Grok first, cheerio fallback) ────────────────────────
async function parseProduct(html: string, url: string, listingPrice?: string): Promise<ExtractedProduct | null> {
  console.log(`\n${"=".repeat(60)}\n[PARSE] ${url}\n${"=".repeat(60)}`);
  const origin = new URL(url).origin;
  const resolveImage = (src: string) => resolveUrl(origin, src);

  const [grokResult, cheerioResult] = await Promise.all([
    extractWithGrok(html, url),
    Promise.resolve(parseProductCheerio(html, url, listingPrice)),
  ]);

  if (grokResult && grokResult.productName) {
    console.log(`\n[PARSE] ✓ Using Grok result (with cheerio fill-ins for missing fields)`);
    return {
      productName:     grokResult.productName    || cheerioResult?.productName    || "",
      genericName:     grokResult.genericName    || cheerioResult?.genericName    || "",
      category:        grokResult.category       || cheerioResult?.category       || "",
      subCategory:     grokResult.subCategory    || cheerioResult?.subCategory    || "",
      subsubCategory:  grokResult.subsubCategory || cheerioResult?.subsubCategory || "",
      productType:     grokResult.productType    || cheerioResult?.productType    || "",
      description:     grokResult.description    || cheerioResult?.description    || "",
      dosage:          grokResult.dosage         || cheerioResult?.dosage         || "",
      productLink:     url,
      imageUrl:        resolveImage(cheerioResult?.imageUrl || "") || resolveImage(grokResult.imageUrl || ""),
      outofstock:      grokResult.outofstock     ?? false,
      variants:        (grokResult.variants && grokResult.variants.length > 0)
                         ? grokResult.variants
                         : cheerioResult?.variants?.length
                           ? cheerioResult.variants
                           : listingPrice ? [{ packingVolume: "", customerPrice: listingPrice }] : [],
    };
  }

  console.log(`\n[PARSE] Grok unavailable/failed — using cheerio only`);
  return cheerioResult;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    console.log(`\n${"#".repeat(60)}\n[SCRAPE] Starting — url: ${url}\n${"#".repeat(60)}`);

    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    let parsed: URL;
    try { parsed = new URL(url); } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const html = await fetchHtml(parsed.href);
    if (!html) return NextResponse.json({ error: "Could not fetch the URL." }, { status: 400 });

    console.log(`\n[SCRAPE] Fetched listing page — looking for product links and prices`);
    const links = getProductLinks(html, parsed.origin, parsed.pathname);
    const listingPrices = extractListingPrices(html, parsed.origin);

    if (!links.length) {
      console.log(`[SCRAPE] No links found — treating URL itself as single product page`);
      const single = await parseProduct(html, parsed.href);
      if (single) return NextResponse.json({ success: true, count: 1, totalLinks: 1, products: [single] });
      return NextResponse.json({ error: "No products found on this page." }, { status: 400 });
    }

    const toFetch = links;
    console.log(`\n[SCRAPE] Will fetch all ${toFetch.length} product pages`);

    const products: ExtractedProduct[] = [];

    for (let i = 0; i < toFetch.length; i += 3) {
      const batch = toFetch.slice(i, i + 3);
      console.log(`\n[SCRAPE] Batch ${Math.floor(i / 3) + 1}: ${batch.join(", ")}`);
      const results = await Promise.all(batch.map(async link => {
        const h = await fetchHtml(link);
        const lp = listingPrices.get(link);
        return h ? parseProduct(h, link, lp) : null;
      }));
      results.forEach(r => r && products.push(r));
      console.log(`[SCRAPE] Batch done — total products so far: ${products.length}`);
    }

    console.log(`\n[SCRAPE] ✓ Done — extracted ${products.length} products`);
    return NextResponse.json({ success: true, count: products.length, totalLinks: links.length, products });
  } catch (e: any) {
    console.log(`[SCRAPE] ✗ Fatal error: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message || "Scraping failed" }, { status: 500 });
  }
}
