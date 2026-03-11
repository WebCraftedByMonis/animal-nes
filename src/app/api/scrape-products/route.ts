import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

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
  description: string;   // merged: desc + ingredients + analytical + additives
  dosage: string;        // feeding instructions
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

/** Remove duplicate comma-separated items */
const dedupCSV = (s: string) =>
  [...new Set(s.split(",").map(clean).filter(Boolean))].join(", ");

function resolveUrl(base: string, href: string): string {
  if (!href) return "";
  if (href.startsWith("http") || href.startsWith("//")) {
    return href.startsWith("//") ? "https:" + href : href;
  }
  try { return new URL(href, base).href; } catch { return href; }
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(12000) });
    return res.ok ? res.text() : null;
  } catch { return null; }
}

function getProductLinks(html: string, origin: string, currentPath: string): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const full = resolveUrl(origin, href);
    try {
      const u = new URL(full);
      const p = u.pathname;
      if (u.origin !== origin) return;
      if (/\/category\//i.test(p)) return;
      if (/\/(cart|checkout|wishlist|account|blog|contact|about|search)\b/i.test(p)) return;
      if (!p.startsWith("/shop/")) return;
      if (p === currentPath) return;
      if (u.search.includes("page=") || u.search.includes("attribute_values=")) return;
      if (p.split("/").filter(Boolean).length < 2) return;
      const key = `${u.origin}${p}`;
      if (!seen.has(key)) { seen.add(key); links.push(key); }
    } catch { /* skip */ }
  });
  return links;
}

function parseProduct(html: string, url: string): ExtractedProduct | null {
  const $raw = cheerio.load(html);
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, noscript").remove();

  const origin = new URL(url).origin;

  // ── JSON-LD ────────────────────────────────────────────────────────────────
  let name = "", currency = "", availability = "", ldDesc = "", imageUrl = "", price = "";
  const ldVariants: ExtractedVariant[] = [];
  let breadcrumb: string[] = [];

  $raw('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($raw(el).html() || "{}");
      (Array.isArray(json) ? json : [json]).forEach((item: any) => {
        // Breadcrumb
        if (item["@type"] === "BreadcrumbList") {
          breadcrumb = (item.itemListElement || [])
            .sort((a: any, b: any) => a.position - b.position)
            .map((c: any) => c.name as string)
            .filter((n: string) => n && n !== "All Products");
        }
        // ProductGroup (variants)
        if (item["@type"] === "ProductGroup") {
          if (!name) name = item.name || "";
          if (!imageUrl) { const i = item.image; imageUrl = Array.isArray(i) ? i[0] : i || ""; }
          (item.hasVariant || []).forEach((v: any) => {
            const o = Array.isArray(v.offers) ? v.offers[0] : v.offers || {};
            if (!currency) currency = o.priceCurrency || "";
            if (!availability) availability = (o.availability || "").replace("https://schema.org/", "");
            if (!ldDesc) ldDesc = v.description || "";
            const label = (v.name || "").replace(name, "").replace(/[()]/g, "").trim();
            ldVariants.push({
              packingVolume: label || v.name || "",
              customerPrice: o.price != null ? String(o.price) : "",
            });
            if (!price) price = o.price != null ? String(o.price) : "";
          });
        }
        // Single Product
        if (item["@type"] === "Product") {
          if (!name) name = item.name || "";
          if (!imageUrl) { const i = item.image; imageUrl = Array.isArray(i) ? i[0] : i || ""; }
          const o = Array.isArray(item.offers) ? item.offers[0] : item.offers || {};
          if (!price) price = o.price != null ? String(o.price) : "";
          if (!currency) currency = o.priceCurrency || "";
          if (!availability) availability = (o.availability || "").replace("https://schema.org/", "");
          // Don't use desc if it looks like a bare barcode
          if (!ldDesc && item.description && !/^\d+$/.test(item.description.trim())) {
            ldDesc = item.description;
          }
        }
      });
    } catch { /* skip */ }
  });

  const productName = name || clean($("h1").first().text()) || clean($('meta[property="og:title"]').attr("content") || "");
  if (!productName) return null;

  // ── Category from breadcrumb ───────────────────────────────────────────────
  // breadcrumb last item is the product name itself — drop it
  const cats = breadcrumb.filter(c => c !== productName);
  const category    = cats[0] || "";
  const subCategory = cats[1] || "";
  const subsubCategory = cats[2] || "";

  // ── Resolved image ─────────────────────────────────────────────────────────
  const image = resolveUrl(origin, imageUrl) || resolveUrl(origin, $('meta[property="og:image"]').attr("content") || "");

  // ── Attribute extraction ───────────────────────────────────────────────────
  const attrs = new Map<string, string>();

  const addAttr = (k: string, v: string) => {
    k = clean(k); v = clean(v);
    if (!k || !v || k.length > 100 || k === v) return;
    if (!attrs.has(k) || v.length > (attrs.get(k) || "").length) attrs.set(k, v);
  };

  // h5/h6 headings (Odoo style)
  $(["h5","h6"].join(",")).each((_, el) => {
    const key = clean($(el).text());
    if (!key || key.length > 80) return;
    const val = clean($(el).next().text()) || clean($(el).parent().next().first().text());
    if (val) addAttr(key, val);
  });
  // table rows
  $("table tr").each((_, row) => {
    const cells = $(row).find("td, th");
    if (cells.length >= 2) addAttr(cells.eq(0).text(), cells.eq(1).text());
  });
  // dl
  $("dl dt").each((_, dt) => addAttr($(dt).text(), $(dt).next("dd").text()));
  // "Key: Value" in spec sections
  $(".product_attributes, #product_attributes, .o_product_page_content").find("li, p").each((_, el) => {
    if ($(el).children().length > 2) return;
    const m = clean($(el).text()).match(/^([^:]{2,60}):\s*(.{1,800})$/);
    if (m) addAttr(m[1], m[2]);
  });

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

  // Remove noise attrs we don't need
  pull("Size", "Weight", "Pack Size", "Pet Type", "Age Group", "Breed",
       "Made In Country", "Made In", "Life Stage", "Diet Type", "SKU", "Barcode");

  // ── Build merged description ───────────────────────────────────────────────
  const descParts: string[] = [];
  const baseDesc = ldDesc || clean($('meta[property="og:description"]').attr("content") || "");
  if (baseDesc) descParts.push(baseDesc);
  if (ingredients) descParts.push(`Ingredients: ${ingredients}`);
  if (analytical)  descParts.push(`Analytical Constituents: ${analytical}`);
  if (additives)   descParts.push(`Additives: ${additives}`);
  const description = descParts.join("\n\n").substring(0, 2000);

  // ── Variants ──────────────────────────────────────────────────────────────
  let variants: ExtractedVariant[] = ldVariants;
  if (!variants.length && price) {
    const sizeHint = productName.match(/[\d.]+\s*(?:kg|g|lbs?|oz|ml|l)\b/i)?.[0] || "";
    variants = [{ packingVolume: sizeHint, customerPrice: price }];
  }
  // Clean customerPrice: strip currency prefix, keep number only
  variants = variants.map(v => ({
    packingVolume: clean(v.packingVolume),
    customerPrice: v.customerPrice.replace(/[^\d.]/g, ""),
  })).filter(v => v.customerPrice);

  return {
    productName: clean(productName),
    genericName,
    category,
    subCategory,
    subsubCategory,
    productType,
    description,
    dosage,
    productLink: url,
    imageUrl: image,
    outofstock: /OutOfStock|out.?of.?stock/i.test(availability),
    variants,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { url, maxProducts = 20 } = await req.json();
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    let parsed: URL;
    try { parsed = new URL(url); } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const html = await fetchHtml(parsed.href);
    if (!html) return NextResponse.json({ error: "Could not fetch the URL." }, { status: 400 });

    const links = getProductLinks(html, parsed.origin, parsed.pathname);

    if (!links.length) {
      const single = parseProduct(html, parsed.href);
      if (single) return NextResponse.json({ success: true, count: 1, totalLinks: 1, products: [single] });
      return NextResponse.json({ error: "No products found on this page." }, { status: 400 });
    }

    const toFetch = links.slice(0, Math.min(maxProducts, 50));
    const products: ExtractedProduct[] = [];

    for (let i = 0; i < toFetch.length; i += 5) {
      const batch = toFetch.slice(i, i + 5);
      const results = await Promise.all(batch.map(async link => {
        const h = await fetchHtml(link);
        return h ? parseProduct(h, link) : null;
      }));
      results.forEach(r => r && products.push(r));
    }

    return NextResponse.json({ success: true, count: products.length, totalLinks: links.length, products });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Scraping failed" }, { status: 500 });
  }
}
