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
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.5",
  Referer: "https://yallapets.com/",
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const isImageUrl = (u: string) =>
  /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(u) &&
  !u.includes("placeholder") &&
  !u.includes("logo");

function htmlToText(html: string): string {
  if (!html) return "";
  return clean(cheerio.load(html).text());
}

async function fetchJson(url: string): Promise<{ data: any; linkHeader: string }> {
  try {
    const res = await axios.get(url, {
      headers: HEADERS,
      timeout: 20000,
      httpsAgent,
      maxRedirects: 5,
      validateStatus: (s) => s < 500,
    });
    if (res.status >= 400) return { data: null, linkHeader: "" };
    return { data: res.data, linkHeader: String(res.headers["link"] || "") };
  } catch (e: any) {
    console.log(`[FETCH-JSON] ✗ ${e.message}`);
    return { data: null, linkHeader: "" };
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  console.log(`[FETCH] → ${url}`);
  try {
    const res = await axios.get(url, {
      headers: { ...HEADERS, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
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

function parseNextFromLink(linkHeader: string): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

// ── Fetch all products from a Shopify collection ───────────────────────────────
async function fetchShopifyProducts(origin: string, collectionHandle: string): Promise<ExtractedProduct[]> {
  const products: ExtractedProduct[] = [];
  let url: string | null = `${origin}/collections/${collectionHandle}/products.json?limit=250`;

  while (url) {
    console.log(`[SHOPIFY] → ${url}`);
    const { data, linkHeader } = await fetchJson(url);
    if (!data?.products?.length) break;

    for (const item of data.products) {
      const name = clean(item.title || "");
      if (!name) continue;

      const imageUrl = item.images?.[0]?.src
        ? (isImageUrl(item.images[0].src) ? item.images[0].src : "")
        : "";

      const description = htmlToText(item.body_html || "").substring(0, 3000);

      const variants: ExtractedVariant[] = (item.variants || [])
        .filter((v: any) => v.title && !/^default title$/i.test(v.title))
        .map((v: any) => ({
          packingVolume: clean(v.title || ""),
          customerPrice: v.price ? String(Math.round(parseFloat(v.price))) : "",
        }));

      if (!variants.length && item.variants?.length) {
        const v = item.variants[0];
        variants.push({
          packingVolume: "",
          customerPrice: v.price ? String(Math.round(parseFloat(v.price))) : "",
        });
      }

      const outofstock = item.variants?.every((v: any) => !v.available) ?? false;

      products.push({
        productName: name,
        genericName: item.vendor ? clean(item.vendor) : "",
        category: item.product_type ? clean(item.product_type) : "",
        subCategory: "",
        subsubCategory: "",
        productType: "",
        description,
        dosage: "",
        productLink: `${origin}/products/${item.handle}`,
        imageUrl,
        outofstock,
        variants,
      });
    }

    url = parseNextFromLink(linkHeader);
  }

  console.log(`[SHOPIFY] ${products.length} products total`);
  return products;
}

// ── Enrich description from detail page ───────────────────────────────────────
function parseDetailPage(html: string, apiDescription: string): { description: string; dosage: string } {
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, noscript, .header, .footer, .announcement-bar").remove();

  const selectors = [
    ".product__description",
    ".product-description",
    "[data-product-description]",
    ".product__info .rte",
    ".product-single__description",
    ".description",
    "#product-description",
    ".tab-content--description",
    ".product__tab-content",
    ".rte",
  ];

  let pageDesc = "";
  for (const sel of selectors) {
    const t = clean($(sel).text());
    if (t.length > pageDesc.length) pageDesc = t;
  }

  const description = (pageDesc.length > apiDescription.length ? pageDesc : apiDescription).substring(0, 3000);

  let dosage = "";
  $(".tab, .accordion__content, [data-tab], .product__tab-content, .tab-pane").each((_, el) => {
    const heading = clean($(el).find("h2,h3,h4,.tab__title,.accordion__title,button").first().text());
    if (/direction|dosage|feeding|how to|usage|administration/i.test(heading)) {
      dosage = clean($(el).text().replace(heading, "")).substring(0, 1000);
      return false;
    }
  });

  return { description, dosage };
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
    const colIndex = pathParts.indexOf("collections");
    const collectionHandle = colIndex >= 0 ? pathParts[colIndex + 1] : pathParts[pathParts.length - 1];

    if (!collectionHandle) {
      return NextResponse.json({ error: "Could not determine collection from URL." }, { status: 400 });
    }

    console.log(`[YALLAPETS] origin=${origin}, collection=${collectionHandle}`);

    const apiProducts = await fetchShopifyProducts(origin, collectionHandle);
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
        const { description, dosage } = parseDetailPage(h, p.description);
        return { ...p, description: description || p.description, dosage: dosage || p.dosage } as ExtractedProduct;
      }));
      results.forEach(r => enriched.push(r));
      console.log(`[YALLAPETS] batch ${Math.floor(i / 3) + 1}, total: ${enriched.length}`);
    }

    return NextResponse.json({ success: true, count: enriched.length, totalLinks: enriched.length, products: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Scraping failed" }, { status: 500 });
  }
}
