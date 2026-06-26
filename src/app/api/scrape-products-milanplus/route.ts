import { NextRequest } from "next/server";
import * as cheerio from "cheerio";
import axios from "axios";
import https from "https";

export const maxDuration = 120;

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

const clean = (s: string) => (s || "").replace(/\s+/g, " ").trim();
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  Referer: "https://milanplus.ae/",
};

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const r = await axios.get(url, {
      headers: HEADERS, timeout: 20000, httpsAgent,
      maxRedirects: 5, responseType: "text", validateStatus: s => s < 500,
    });
    return r.status >= 400 ? null : String(r.data);
  } catch { return null; }
}

// Collect all product URLs from one or more category pages
async function collectProductUrls(startUrl: string): Promise<string[]> {
  const seen = new Set<string>();
  const urls: string[] = [];
  // Product URL pattern: /shop/SLUG-[hex chars 10+]
  const productRe = /href="(https?:\/\/milanplus\.ae\/shop\/[^"\/]+-[a-f0-9]{10,})"/g;
  const origin = new URL(startUrl).origin;

  let pageNum = 1;
  while (true) {
    const pageUrl = pageNum === 1 ? startUrl : `${startUrl}?page=${pageNum}`;
    const html = await fetchHtml(pageUrl);
    if (!html) break;

    let foundOnPage = 0;
    let m;
    const re = new RegExp(productRe.source, "g");
    while ((m = re.exec(html)) !== null) {
      const u = m[1];
      if (!seen.has(u)) { seen.add(u); urls.push(u); foundOnPage++; }
    }

    if (foundOnPage === 0) break;
    pageNum++;
    if (pageNum > 50) break; // safety cap
  }

  return urls;
}

function parseProductPage(html: string, url: string): ExtractedProduct | null {
  const $ = cheerio.load(html);

  // Remove related products section (at bottom) to avoid picking up their data
  $(".corporate-product-card").closest(".row, section, div.container").filter((_, el) => {
    const t = $(el).text().slice(0, 100);
    return /related|you may also|similar/i.test(t);
  }).remove();

  // Name from product-about section's h2 (more reliable than breadcumb-title)
  const name = clean($(".product-about h2.product-title, h2.product-title").first().text())
    || clean($("h1.breadcumb-title").first().text());
  if (!name) return null;

  // Image: <img id="product-main-image">
  let imageUrl = $("img#product-main-image").attr("src") || "";
  if (!imageUrl) imageUrl = $('meta[property="og:image"]').attr("content") || "";

  // Price: <p class="price">AED 119.00</p>
  const priceRaw = clean($(".product-about p.price").first().text() || $("p.price").first().text());
  const priceMatch = priceRaw.match(/[\d,]+\.?\d*/);
  const price = priceMatch ? priceMatch[0].replace(/,/g, "").replace(/\.\d+$/, "") : "";

  // Description: <p class="text"> in product-about area
  const description = clean(
    $(".product-about p.text").first().text() ||
    $(".product-details p.text").first().text()
  ).substring(0, 3000);

  // Stock
  const inStockEl = $("span.stock.in-stock");
  const outStockEl = $("span.stock.out-of-stock");
  const outofstock = outStockEl.length > 0 || (inStockEl.length === 0 && /out.of.stock|unavailable|sold.out/i.test(html));

  // Breadcrumb: ul.breadcumb-menu > li (Home, Shop, Category, Product Details)
  const bcItems: string[] = [];
  $("ul.breadcumb-menu li").each((_, el) => {
    const t = clean($(el).text());
    if (t && t !== "Home" && t !== "Shop" && t !== "Product Details") bcItems.push(t);
  });
  const category = bcItems[0] || "";
  const subCategory = bcItems[1] || "";

  return {
    productName: name,
    genericName: "",
    category,
    subCategory,
    subsubCategory: "",
    productType: "",
    description,
    dosage: "",
    productLink: url,
    imageUrl,
    outofstock,
    variants: [{ packingVolume: "", customerPrice: price }],
  };
}

function sseEvent(enc: TextEncoder, data: object) {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  const { url } = await req.json().catch(() => ({}));
  if (!url) return new Response(JSON.stringify({ error: "URL required" }), { status: 400 });

  try { new URL(url); } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400 });
  }

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (d: object) => { try { controller.enqueue(sseEvent(enc, d)); } catch {} };

      try {
        send({ type: "status", message: "Collecting product links from category page…" });

        const productUrls = await collectProductUrls(url);
        if (!productUrls.length) {
          send({ type: "error", message: "No products found. Make sure the URL is a milanplus.ae category page." });
          controller.close(); return;
        }

        send({ type: "total", total: productUrls.length });
        send({ type: "status", message: `Found ${productUrls.length} products. Scraping details…` });

        // Fetch detail pages in batches of 4
        for (let i = 0; i < productUrls.length; i += 4) {
          const batch = productUrls.slice(i, i + 4);
          const results = await Promise.all(batch.map(async (pUrl) => {
            const html = await fetchHtml(pUrl);
            return html ? parseProductPage(html, pUrl) : null;
          }));
          for (const p of results) if (p) send({ type: "product", product: p });
        }

        send({ type: "done" });
      } catch (e: any) {
        send({ type: "error", message: e.message || "Scraping failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
