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

function normalizeUrl(url: string): string {
  try { const u = new URL(url); return `${u.origin}${u.pathname}`; } catch { return url; }
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
    if (res.status >= 400) { console.log(`[FETCH] ✗ ${res.status}`); return null; }
    const html = typeof res.data === "string" ? res.data : String(res.data);
    console.log(`[FETCH] ✓ ${html.length} chars`);
    return html;
  } catch (e: any) {
    console.log(`[FETCH] ✗ ${e.message} | code: ${e.code || ""}`);
    return null;
  }
}

// ── Get product links from a listing page ─────────────────────────────────────
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

      if (u.origin !== origin) { skipped["different-origin"] = (skipped["different-origin"] || 0) + 1; return; }
      if (/^\/(web|website|page|pages|blog|news|about|contact|faq|terms|privacy|r|my)\b/i.test(p)) {
        skipped["non-shop"] = (skipped["non-shop"] || 0) + 1; return;
      }
      if (/\/(cart|checkout|wishlist|account|search|login|register|compare|tag|brands|change_pricelist|reset_password)\b/i.test(p)) {
        skipped["utility"] = (skipped["utility"] || 0) + 1; return;
      }
      // Skip pagination paths like /page/2
      if (/\/page\/\d+\/?$/.test(p)) { skipped["pagination-path"] = (skipped["pagination-path"] || 0) + 1; return; }
      // Skip query-based pagination/filters
      if (u.search.includes("page=") || u.search.includes("attribute_values=") || u.search.includes("order=")) {
        skipped["pagination-query"] = (skipped["pagination-query"] || 0) + 1; return;
      }
      if (p === currentPath) { skipped["current-page"] = (skipped["current-page"] || 0) + 1; return; }
      if (p.split("/").filter(Boolean).length < 2) { skipped["too-short"] = (skipped["too-short"] || 0) + 1; return; }
      // Skip category index pages
      if (/\/category\/[^/]+\/?$/.test(p)) { skipped["category-index"] = (skipped["category-index"] || 0) + 1; return; }

      const key = normalizeUrl(full);
      if (!seen.has(key)) { seen.add(key); links.push(key); }
    } catch { skipped["parse-error"] = (skipped["parse-error"] || 0) + 1; }
  });

  console.log(`[LINKS] Found ${links.length} product links | Skipped:`, skipped);
  return links;
}

// ── Get pagination page URLs from a listing page ───────────────────────────────
function getPaginationLinks(html: string, origin: string): string[] {
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

  console.log(`[PAGINATION] Found ${pages.length} additional pages:`, pages);
  return pages;
}

// ── Extract prices from listing page ──────────────────────────────────────────
function extractListingPrices(html: string, origin: string): Map<string, string> {
  const $ = cheerio.load(html);
  const priceMap = new Map<string, string>();

  // Odoo B2B: each product card is a form.oe_product_cart
  $(".oe_product_cart").each((_, form) => {
    const link = $(form).find("a[href]").first().attr("href") || "";
    if (!link) return;
    const normUrl = normalizeUrl(resolveUrl(origin, link));

    // Price is in: <b>Retail Price:</b> <span>VALUE</span>
    let price = "";
    $(form).find("b").each((_, b) => {
      if (/retail\s*price/i.test($(b).text())) {
        price = clean($(b).next("span").text()).replace(/[^\d.]/g, "");
        if (!price) {
          // Try sibling span or parent p span
          price = clean($(b).closest("p").find("span").last().text()).replace(/[^\d.]/g, "");
        }
      }
    });

    if (!price) {
      // Fallback: regex on full card text
      const m = clean($(form).text()).match(/retail\s*price[^\d]*(\d[\d.,]+)/i);
      if (m) price = m[1].replace(/,/g, "");
    }

    if (price && parseFloat(price) > 0) {
      priceMap.set(normUrl, price);
      console.log(`[LISTING PRICE] ${normUrl} → ${price}`);
    }
  });

  console.log(`[LISTING PRICE] Total found: ${priceMap.size}`);
  return priceMap;
}

// ── Strip trailing size/weight from product name to get base name for grouping ─
function getBaseName(name: string): string {
  return name
    // "4 x 15pcs", "6x85g", "2.0 x 25-35cm"
    .replace(/\s+\d[\d.]*\s*x\s*[\d.]+(?:-[\d.]+)?\s*(?:cm|mm|m|kg|g|ml|l|oz|lbs?|pcs?)\b.*$/i, "")
    // "3kg", "400g", "500ml", "4 litres", "350 ml", "10kg 100g", "60 count"
    .replace(/\s+\d[\d.]*\s*(?:kg|g|ml|l|oz|lbs?|litres?|liters?|pcs?|count|pack)\b.*$/i, "")
    // Trailing bare number "135"
    .replace(/\s+\d+$/, "")
    .trim()
    .toLowerCase();
}

// ── Extract size hint from product name ────────────────────────────────────────
function extractSizeFromName(name: string): string {
  const m = name.match(
    /\d[\d.]*\s*x\s*[\d.]+(?:-[\d.]+)?\s*(?:cm|mm|m|kg|g|ml|l|oz|lbs?|pcs?)\b.*$|\d[\d.]*\s*(?:kg|g|ml|l|oz|lbs?|litres?|pcs?|count)\b.*/i
  );
  return m ? m[0].trim() : "";
}

// ── Group products with same base name into one product with multiple variants ─
function groupProductsByVariants(products: ExtractedProduct[]): ExtractedProduct[] {
  const groups = new Map<string, ExtractedProduct[]>();

  for (const p of products) {
    const base = getBaseName(p.productName);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base)!.push(p);
  }

  const result: ExtractedProduct[] = [];

  for (const [baseName, group] of groups) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    // Pick primary = most complete data (longest description + dosage)
    group.sort((a, b) =>
      (b.description.length + b.dosage.length) - (a.description.length + a.dosage.length)
    );
    const primary = group[0];

    // Collect variants from all products
    const allVariants: ExtractedVariant[] = [];
    for (const p of group) {
      const sizeHint = extractSizeFromName(p.productName);
      if (p.variants.length > 0) {
        for (const v of p.variants) {
          allVariants.push({
            packingVolume: v.packingVolume || sizeHint,
            customerPrice: v.customerPrice,
          });
        }
      } else {
        // No variant data — still add as variant with size hint
        allVariants.push({ packingVolume: sizeHint, customerPrice: "" });
      }
    }

    // Remove duplicate packingVolume entries
    const seen = new Set<string>();
    const dedupVariants = allVariants.filter(v => {
      const key = `${v.packingVolume}|${v.customerPrice}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });

    // Use primary's name but strip the size from it
    const mergedName = primary.productName
      .replace(/\s+\d[\d.]*\s*x\s*[\d.]+(?:-[\d.]+)?\s*(?:cm|mm|m|kg|g|ml|l|oz|lbs?|pcs?)\b.*$/i, "")
      .replace(/\s+\d[\d.]*\s*(?:kg|g|ml|l|oz|lbs?|litres?|pcs?|count)\b.*$/i, "")
      .trim();

    console.log(`[GROUP] "${baseName}" → merged ${group.length} products into 1 with ${dedupVariants.length} variants`);

    result.push({
      ...primary,
      productName: mergedName || primary.productName,
      variants: dedupVariants,
    });
  }

  console.log(`[GROUP] ${products.length} products → ${result.length} after grouping`);
  return result;
}

// ── Cheerio product extraction from detail page ────────────────────────────────
function parseProductCheerio(html: string, url: string, listingPrice?: string): ExtractedProduct | null {
  console.log(`\n[CHEERIO] Parsing: ${url}`);

  const $raw = cheerio.load(html);
  // Work on a copy with nav/footer/header stripped for content extraction
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, noscript, .o_footer_copyright, .o_header_standard").remove();

  const origin = new URL(url).origin;

  // ── JSON-LD (if present) ────────────────────────────────────────────────────
  let name = "", currency = "", availability = "", ldDesc = "", imageUrl = "", price = "";
  const ldVariants: ExtractedVariant[] = [];
  let breadcrumb: string[] = [];
  let ldScriptCount = 0;

  $raw('script[type="application/ld+json"]').each((_, el) => {
    ldScriptCount++;
    const raw = $raw(el).html() || "{}";
    console.log(`[CHEERIO] JSON-LD #${ldScriptCount} (${raw.length} chars): ${raw.substring(0, 150)}...`);
    try {
      const json = JSON.parse(raw);
      (Array.isArray(json) ? json : [json]).forEach((item: any) => {
        if (item["@type"] === "BreadcrumbList") {
          breadcrumb = (item.itemListElement || [])
            .sort((a: any, b: any) => a.position - b.position)
            .map((c: any) => c.name as string)
            .filter((n: string) => n && n !== "All Products");
          console.log(`[CHEERIO] Breadcrumb: ${breadcrumb.join(" > ")}`);
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
        }
        if (item["@type"] === "Product") {
          if (!name) name = item.name || "";
          if (!imageUrl) { const i = item.image; imageUrl = Array.isArray(i) ? i[0] : i || ""; }
          const o = Array.isArray(item.offers) ? item.offers[0] : item.offers || {};
          if (!price) price = o.price != null ? String(o.price) : "";
          if (!currency) currency = o.priceCurrency || "";
          if (!availability) availability = (o.availability || "").replace("https://schema.org/", "");
          if (!ldDesc && item.description && !/^\d+$/.test(item.description.trim())) ldDesc = item.description;
        }
      });
    } catch (e: any) {
      console.log(`[CHEERIO] JSON-LD parse error: ${e.message}`);
    }
  });

  // ── HTML breadcrumb fallback ────────────────────────────────────────────────
  if (!breadcrumb.length) {
    $(".breadcrumb li, nav[aria-label*='breadcrumb'] li, ol.breadcrumb li").each((_, li) => {
      const t = clean($(li).text());
      if (t && t !== "Home" && t !== "All Products") breadcrumb.push(t);
    });
    // Last item is product name itself — remove it for category extraction
    if (breadcrumb.length > 1) breadcrumb = breadcrumb.slice(0, -1);
    if (breadcrumb.length) console.log(`[CHEERIO] HTML breadcrumb: ${breadcrumb.join(" > ")}`);
  }

  // ── Product name ───────────────────────────────────────────────────────────
  const ogTitle = clean($('meta[property="og:title"]').attr("content") || "").replace(/&amp;/g, "&");
  const productName = name || clean($("h1").first().text()) || ogTitle;
  console.log(`[CHEERIO] productName: "${productName}"`);

  if (!productName) {
    console.log(`[CHEERIO] ✗ No product name — skipping`);
    return null;
  }

  // ── Image ──────────────────────────────────────────────────────────────────
  const ogImage = $('meta[property="og:image"]').attr("content") || "";
  const image = resolveUrl(origin, imageUrl) || resolveUrl(origin, ogImage);
  console.log(`[CHEERIO] image: "${image}"`);

  // ── Categories from breadcrumb ─────────────────────────────────────────────
  const cats = breadcrumb.filter(c => c !== productName);
  const category       = cats[0] || "";
  const subCategory    = cats[1] || "";
  const subsubCategory = cats[2] || "";

  // ── Attribute extraction (limit to product content area) ──────────────────
  const attrs = new Map<string, string>();
  const addAttr = (k: string, v: string) => {
    k = clean(k); v = clean(v);
    if (!k || !v || k.length > 100 || k === v) return;
    // Skip nav/footer garbage and Odoo internal fields
    if (/^(follow us|newsletter|company|contact|locator|services|arrivals|explore|retail price|sku|barcode)/i.test(k)) return;
    if (!attrs.has(k) || v.length > (attrs.get(k) || "").length) attrs.set(k, v);
  };

  // Target the product detail content area specifically
  const productArea = $(
    "#product_detail, .o_product_page_content, [id*='product_detail'], .product_detail_main, .o_wsale_product_page"
  );
  const scope = productArea.length ? productArea : $("main, #wrapwrap");

  scope.find("table tr").each((_, row) => {
    const cells = $(row).find("td, th");
    if (cells.length >= 2) addAttr(cells.eq(0).text(), cells.eq(1).text());
  });
  scope.find("dl dt").each((_, dt) => addAttr($(dt).text(), $(dt).next("dd").text()));
  scope.find("li, p").each((_, el) => {
    if ($(el).children("ul, ol, div, table").length) return;
    const m = clean($(el).text()).match(/^([^:]{2,60}):\s*(.{2,800})$/);
    if (m) addAttr(m[1], m[2]);
  });

  console.log(`[CHEERIO] Attributes (${attrs.size}):`, Object.fromEntries([...attrs].slice(0, 10)));

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

  const genericName  = pull("Brand", "Manufacturer", "Made By");
  const productType  = pull("Food Type", "Product Type", "Form", "Formulation", "Type");
  let   dosage       = pull("Feeding Instructions", "Feeding Guide", "Dosage", "Feeding", "Transition", "Direction");
  const ingredients  = pull("Ingredients", "Composition");
  const analytical   = pull("Analytical Constituents", "Guaranteed Analysis", "Nutritional Analysis", "Guaranteed");
  const additives    = pull("Additives", "Supplements");

  console.log(`[CHEERIO] genericName:"${genericName}" productType:"${productType}" dosage(${dosage.length} chars)`);

  pull("Size", "Weight", "Pack Size", "Pet Type", "Age Group", "Breed",
       "Made In", "Life Stage", "Diet Type", "SKU", "Barcode", "Country");

  // ── Dosage from "Direction of Use" accordion (Odoo collapse cards) ─────────
  if (!dosage) {
    $(".card, .accordion-item").each((_, card) => {
      const header = clean($(card).find(".card-header, .accordion-header, .accordion-button, [role='tab']").first().text());
      if (/direction|dosage|feeding|usage|how to use/i.test(header)) {
        const body = clean($(card).find(".card-body, .accordion-body, .collapse").text());
        if (body.length > 5) { dosage = body; return false; }
      }
    });
    if (dosage) console.log(`[CHEERIO] Dosage from accordion (${dosage.length} chars)`);
  }

  // ── Description from Odoo oe_structure (rich content block) ───────────────
  let oeDesc = "";
  scope.find(".oe_structure").each((_, el) => {
    const t = clean($(el).text());
    if (t.length > 30 && !/^\d+$/.test(t)) {
      oeDesc += (oeDesc ? "\n\n" : "") + t;
    }
  });

  // Remaining long attrs as extra description
  const remainingDesc = [...attrs.values()].filter(v => v.length > 40).join("\n\n");

  // ── Assemble description ───────────────────────────────────────────────────
  const ogDesc = clean($('meta[property="og:description"]').attr("content") || "");
  const baseDesc = ldDesc || oeDesc || (!/^\d+$/.test(ogDesc) && ogDesc.length > 10 ? ogDesc : "");

  const descParts: string[] = [];
  if (baseDesc) descParts.push(baseDesc);
  else if (remainingDesc) descParts.push(remainingDesc);
  if (ingredients) descParts.push(`Ingredients: ${ingredients}`);
  if (analytical)  descParts.push(`Analytical Constituents: ${analytical}`);
  if (additives)   descParts.push(`Additives: ${additives}`);
  const description = descParts.join("\n\n").substring(0, 2000);

  console.log(`[CHEERIO] description (${description.length} chars): ${description.substring(0, 80)}...`);

  // ── Price ──────────────────────────────────────────────────────────────────
  if (!price) {
    for (const sel of [
      ".product_price .oe_price .oe_currency_value",
      ".oe_price .oe_currency_value",
      "[itemprop='price']",
      ".price_unit",
      ".product-price",
    ]) {
      const raw = clean($(sel).first().text()).replace(/[^\d.]/g, "");
      if (raw && parseFloat(raw) > 0) { price = raw; console.log(`[CHEERIO] Price via CSS: ${price}`); break; }
    }
  }

  if (!price && listingPrice) {
    price = listingPrice;
    console.log(`[CHEERIO] Using listing price: ${price}`);
  }

  // ── Variants ───────────────────────────────────────────────────────────────
  let variants: ExtractedVariant[] = ldVariants.filter(v => v.customerPrice);
  if (!variants.length && price) {
    const sizeHint = extractSizeFromName(productName);
    variants = [{ packingVolume: sizeHint, customerPrice: price }];
  }
  variants = variants.map(v => ({
    packingVolume: clean(v.packingVolume),
    customerPrice: v.customerPrice.replace(/[^\d.]/g, ""),
  })).filter(v => v.customerPrice);

  console.log(`[CHEERIO] variants (${variants.length}):`, variants);

  return {
    productName: clean(productName),
    genericName, category, subCategory, subsubCategory, productType,
    description, dosage,
    productLink: url,
    imageUrl: image,
    outofstock: /OutOfStock|out.?of.?stock/i.test(availability),
    variants,
  };
}

// ── POST handler ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    console.log(`\n${"#".repeat(60)}\n[SCRAPE] url: ${url}\n${"#".repeat(60)}`);

    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    let parsed: URL;
    try { parsed = new URL(url); } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // ── Fetch first listing page ──────────────────────────────────────────────
    const html = await fetchHtml(parsed.href);
    if (!html) return NextResponse.json({ error: "Could not fetch the URL." }, { status: 400 });

    let allLinks = getProductLinks(html, parsed.origin, parsed.pathname);
    let allPrices = extractListingPrices(html, parsed.origin);

    // ── Handle pagination — fetch all additional pages ─────────────────────────
    const paginationPages = getPaginationLinks(html, parsed.origin);
    if (paginationPages.length > 0) {
      console.log(`\n[SCRAPE] Fetching ${paginationPages.length} pagination pages...`);
      for (const pageUrl of paginationPages) {
        const pageHtml = await fetchHtml(pageUrl);
        if (!pageHtml) continue;
        const pageLinks = getProductLinks(pageHtml, parsed.origin, new URL(pageUrl).pathname);
        const pagePrices = extractListingPrices(pageHtml, parsed.origin);
        // Merge — new links only
        for (const l of pageLinks) {
          if (!allLinks.includes(l)) allLinks.push(l);
        }
        for (const [k, v] of pagePrices) {
          if (!allPrices.has(k)) allPrices.set(k, v);
        }
        console.log(`[SCRAPE] Page ${pageUrl}: +${pageLinks.length} links, total now ${allLinks.length}`);
      }
    }

    // ── If no links, treat URL itself as a single product page ─────────────────
    if (!allLinks.length) {
      console.log(`[SCRAPE] No product links found — trying URL as single product`);
      const single = parseProductCheerio(html, parsed.href);
      if (single) return NextResponse.json({ success: true, count: 1, totalLinks: 1, products: [single] });
      return NextResponse.json({ error: "No products found on this page." }, { status: 400 });
    }

    console.log(`\n[SCRAPE] Total: ${allLinks.length} product pages to fetch`);

    // ── Fetch product detail pages in batches of 3 ────────────────────────────
    const rawProducts: ExtractedProduct[] = [];

    for (let i = 0; i < allLinks.length; i += 3) {
      const batch = allLinks.slice(i, i + 3);
      console.log(`\n[SCRAPE] Batch ${Math.floor(i / 3) + 1}/${Math.ceil(allLinks.length / 3)}: ${batch.join(", ")}`);
      const results = await Promise.all(batch.map(async link => {
        const h = await fetchHtml(link);
        return h ? parseProductCheerio(h, link, allPrices.get(link)) : null;
      }));
      results.forEach(r => r && rawProducts.push(r));
      console.log(`[SCRAPE] Batch done — raw products so far: ${rawProducts.length}`);
    }

    // ── Group products with same base name into one with multiple variants ─────
    const products = groupProductsByVariants(rawProducts);

    console.log(`\n[SCRAPE] ✓ Done — ${rawProducts.length} raw → ${products.length} grouped products`);
    return NextResponse.json({ success: true, count: products.length, totalLinks: allLinks.length, products });

  } catch (e: any) {
    console.log(`[SCRAPE] ✗ Fatal: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message || "Scraping failed" }, { status: 500 });
  }
}
