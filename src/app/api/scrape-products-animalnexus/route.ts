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
  Referer: "https://www.animalnexus.com.pk/",
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

function parseCategoryPage(html: string, origin: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  const re = /href="(https?:\/\/[^"]*\/shop\/single_product\/\d+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1].split("?")[0];
    if (!seen.has(url)) { seen.add(url); urls.push(url); }
  }
  // Also handle relative links
  const reRel = /href="(\/shop\/single_product\/\d+)"/g;
  while ((m = reRel.exec(html)) !== null) {
    const url = origin + m[1];
    if (!seen.has(url)) { seen.add(url); urls.push(url); }
  }
  return urls;
}

function parseProductPage(html: string, url: string): ExtractedProduct | null {
  const $ = cheerio.load(html);

  // Remove related products section to avoid picking up their data
  $("section").filter((_, el) => /Related Products/i.test($(el).text().slice(0, 50))).remove();

  // Name from h1
  const name = clean($("h1").first().text());
  if (!name) return null;

  // Image — has id="main-product-img"
  const imageUrl = $("img#main-product-img").attr("src") || "";

  // Generic name of the product (manufacturer/brand above h1)
  const brandText = clean($("p.text-primary.uppercase").first().text());

  // Tags → category, subCategory, productType
  const tags: string[] = [];
  $("span.bg-surface-container.rounded-full, span.\\[bg-surface-container\\]").each((_, el) => {
    const t = clean($(el).text());
    if (t && !tags.includes(t)) tags.push(t);
  });

  // Also try the tag spans by class pattern
  if (tags.length === 0) {
    $(".flex.flex-wrap.gap-2 span").each((_, el) => {
      const t = clean($(el).text());
      if (t && !tags.includes(t)) tags.push(t);
    });
  }

  // Price — "PKR 80" in the text-3xl span
  const priceRaw = clean($("span.text-3xl").first().text());
  const priceMatch = priceRaw.match(/[\d,]+/);
  const price = priceMatch ? priceMatch[0].replace(/,/g, "") : "";

  // Unit/packing from "Unit: 20 gm" text
  let packingVolume = "";
  $("p.text-xs.text-on-surface-variant, p.text-on-surface-variant").each((_, el) => {
    const t = clean($(el).text());
    if (/^unit:/i.test(t)) {
      packingVolume = t.replace(/^unit:\s*/i, "").trim();
      return false;
    }
  });

  // Generic Name field (labeled section)
  let genericName = "";
  $("p").each((_, el) => {
    if (/^generic\s*name$/i.test(clean($(el).text()))) {
      genericName = clean($(el).next("p").text());
      return false;
    }
  });

  // Dosage field (labeled section)
  let dosage = "";
  $("p").each((_, el) => {
    if (/^dosage$/i.test(clean($(el).text()))) {
      dosage = clean($(el).next("p").text()).substring(0, 1000);
      return false;
    }
  });

  // Description from .prose div
  let description = clean($(".prose").first().text()).substring(0, 3000);

  // Fallback: paragraph after "Description" heading
  if (!description) {
    $("h3").each((_, el) => {
      if (/^description$/i.test(clean($(el).text()))) {
        description = clean($(el).next("div, p").text()).substring(0, 3000);
        return false;
      }
    });
  }

  // Out of stock detection
  const outofstock = /out.of.stock|unavailable|sold.out/i.test(html);

  // Build variant — single variant with unit and price
  const variants: ExtractedVariant[] = [{
    packingVolume: packingVolume || "",
    customerPrice: price,
  }];

  return {
    productName: name,
    genericName: genericName || brandText,
    category: tags[0] || "",
    subCategory: tags[1] || "",
    subsubCategory: tags[2] || "",
    productType: tags[3] || "",
    description,
    dosage,
    productLink: url,
    imageUrl,
    outofstock,
    variants,
  };
}

function sseEvent(enc: TextEncoder, data: object) {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  const { url } = await req.json().catch(() => ({}));
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
        send({ type: "status", message: "Loading category page…" });

        const categoryHtml = await fetchHtml(url);
        if (!categoryHtml) {
          send({ type: "error", message: "Could not load the category page." });
          controller.close(); return;
        }

        const productUrls = parseCategoryPage(categoryHtml, origin);
        if (!productUrls.length) {
          send({ type: "error", message: "No products found on this page. Check the URL." });
          controller.close(); return;
        }

        send({ type: "total", total: productUrls.length });
        send({ type: "status", message: `Found ${productUrls.length} products. Fetching details…` });

        // Fetch detail pages in batches of 5
        for (let i = 0; i < productUrls.length; i += 5) {
          const batch = productUrls.slice(i, i + 5);
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
