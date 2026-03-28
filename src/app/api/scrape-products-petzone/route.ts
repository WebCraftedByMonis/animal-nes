import { NextRequest } from "next/server";
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

const clean = (s: string) => (s || "").replace(/\s+/g, " ").trim();
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await axios.get(url, {
      headers: FETCH_HEADERS,
      timeout: 20000,
      httpsAgent,
      maxRedirects: 5,
      responseType: "text",
      validateStatus: s => s < 500,
    });
    if (res.status >= 400) return null;
    return typeof res.data === "string" ? res.data : String(res.data);
  } catch (e: any) {
    console.log(`[petzone] fetch fail: ${e.message}`);
    return null;
  }
}

// ── GraphQL helper ────────────────────────────────────────────────────────────
async function gqlQuery(baseUrl: string, query: string): Promise<any> {
  const res = await axios.post(
    `${baseUrl}/graphql`,
    { query },
    {
      headers: {
        "Content-Type": "application/json",
        Store: "uae",
      },
      timeout: 20000,
      httpsAgent,
    },
  );
  return res.data?.data;
}

// ── Resolve category ID from URL ───────────────────────────────────────────────
// Input: https://petzone.com/uae/en/category/dog/dog-food/milk-new-born.html
// → url_key = "milk-new-born", path hint = "dog/dog-food/milk-new-born"
async function resolveCategoryId(rawUrl: string, baseUrl: string): Promise<{ id: string; name: string } | null> {
  const u = new URL(rawUrl);
  // Strip /uae/en/category/ prefix and .html suffix
  let pathStr = u.pathname.replace(/^\/[^/]+\/[^/]+\//, ""); // remove /uae/en/
  pathStr = pathStr.replace(/^category\//, "");               // remove category/
  pathStr = pathStr.replace(/\.html$/, "");                   // remove .html
  const urlKey = pathStr.split("/").pop() || "";

  if (!urlKey) return null;

  const data = await gqlQuery(baseUrl, `{
    categoryList(filters: { url_key: { eq: "${urlKey}" } }) {
      id name url_path
    }
  }`);

  const cats: any[] = data?.categoryList || [];
  if (!cats.length) return null;

  // Find best match: prefer the category whose url_path contains our path hint
  const pathHint = pathStr;
  const best = cats.find(c =>
    c.url_path && (c.url_path.endsWith(pathHint) || c.url_path.includes(pathHint))
  ) || cats[0];

  return { id: String(best.id), name: best.name };
}

// ── Fetch one "page" of products via GraphQL ──────────────────────────────────
async function fetchProductPage(
  baseUrl: string,
  categoryId: string,
  page: number,
  pageSize: number,
): Promise<{ items: any[]; totalPages: number; totalCount: number }> {
  const data = await gqlQuery(baseUrl, `{
    products(
      filter: { category_id: { eq: "${categoryId}" } }
      pageSize: ${pageSize}
      currentPage: ${page}
    ) {
      total_count
      page_info { total_pages current_page page_size }
      items {
        name sku url_key
        url_rewrites { url }
        small_image { url label }
        price_range {
          minimum_price {
            final_price { value currency }
          }
        }
        description { html }
        short_description { html }
      }
    }
  }`);

  const raw = data?.products;
  return {
    items: raw?.items || [],
    totalPages: raw?.page_info?.total_pages || 1,
    totalCount: raw?.total_count || 0,
  };
}

// ── Parse product detail page (Hyvä/Magento 2) ───────────────────────────────
function parseTabContent(html: string): { description: string; dosage: string } {
  const $ = cheerio.load(html);

  // Remove noise
  $("script, style, noscript, nav, header, footer").remove();

  let description = "";
  let dosage = "";

  // ── Try standard Magento 2 tab/accordion selectors ──────────────────────
  // Magento 2 with Luma: [data-role="content"] inside [data-role="tablist"]
  // Hyvä: tab panels often use x-show / x-data, content is in the DOM

  // Look for sections labelled "Ingredients" / "Nutrients" / "Composition"
  // and "Feeding" / "Directions" / "Usage"
  const allText = (el: any) => clean($(el).text());

  // Magento 2 collapsible tabs pattern
  $("[data-role='content'], [role='tabpanel'], .tab-content, .product-info-detail-tabs .tab-pane").each((_, el) => {
    const label = clean(
      $(el).attr("aria-label") ||
      $(el).prev("[data-role='title'], .tab-title, button").text() ||
      $(el).find("h2, h3, h4").first().text()
    ).toLowerCase();

    const text = allText(el);
    if (!text) return;

    if (/ingredient|nutri|composit|analyti|constituent/i.test(label) && !description) {
      description = text.substring(0, 3000);
    } else if (/feed|direction|usage|instruct|dosage|how to/i.test(label) && !dosage) {
      dosage = text.substring(0, 1000);
    }
  });

  // Hyvä tabs: look for divs with id or x-show bound to tab names
  if (!description) {
    $("div[id], section[id]").each((_, el) => {
      const id = ($(el).attr("id") || "").toLowerCase();
      const text = allText(el);
      if (!text) return;
      if (/ingredient|nutri|composit|analyti/i.test(id) && !description) {
        description = text.substring(0, 3000);
      } else if (/feed|direction|usage|instruct/i.test(id) && !dosage) {
        dosage = text.substring(0, 1000);
      }
    });
  }

  // Hyvä: look for headings followed by content
  if (!description) {
    $("h2, h3, h4, strong").each((_, heading) => {
      const headText = clean($(heading).text()).toLowerCase();
      if (/ingredient|nutri|composit|analyti/i.test(headText)) {
        // Gather siblings/next elements
        let content = "";
        $(heading).nextAll().each((_, sib) => {
          const t = clean($(sib).text());
          if (!t || /^(description|feeding|direction|usage|instruct)/i.test(t)) return false;
          content += " " + t;
        });
        if (content && !description) description = content.trim().substring(0, 3000);
      } else if (/feeding|direction|usage|instruct|how to/i.test(headText)) {
        let content = "";
        $(heading).nextAll().each((_, sib) => {
          const t = clean($(sib).text());
          if (!t || /^(description|ingredient|nutri|composit)/i.test(t)) return false;
          content += " " + t;
        });
        if (content && !dosage) dosage = content.trim().substring(0, 1000);
      }
    });
  }

  return { description, dosage };
}

// ── Build AED price string from GraphQL price_range ──────────────────────────
function buildPrice(priceRange: any, html?: string): string {
  // Try DOM first — AED price on the page is accurate
  if (html) {
    const $ = cheerio.load(html);
    const priceEl =
      $("[data-price-type='finalPrice'] .price, .price-box .price--final .price, [itemprop='price']")
        .first();
    const priceAttr = priceEl.attr("content") || priceEl.attr("data-price-amount");
    if (priceAttr) return String(Math.round(parseFloat(priceAttr)));

    // Regex: "AED XX" or "AED XX.XX"
    const m = html.match(/AED\s*([\d,]+(?:\.\d+)?)/);
    if (m) return String(Math.round(parseFloat(m[1].replace(/,/g, ""))));
  }

  // Fall back to GraphQL value (may be KWD; at least gives a number)
  const val = priceRange?.minimum_price?.final_price?.value;
  if (val != null) return String(Math.round(val));
  return "";
}

// ── Convert one GraphQL product item + optional detail HTML → ExtractedProduct
async function buildProduct(
  item: any,
  baseUrl: string,
): Promise<ExtractedProduct | null> {
  if (!item?.name) return null;

  // Build product URL from url_rewrites (shortest non-shop-by-pet path preferred)
  let productPath = item.url_rewrites?.[0]?.url || `${item.url_key}.html`;
  const rewrites: string[] = (item.url_rewrites || []).map((r: any) => r.url);
  const preferred = rewrites.find(u => !/shop-by-pet/i.test(u));
  if (preferred) productPath = preferred;
  const productUrl = `${baseUrl}/${productPath}`;

  // Image
  let imageUrl = item.small_image?.url || "";
  if (imageUrl.startsWith("//")) imageUrl = "https:" + imageUrl;

  // Attempt to get tab content from detail page
  let description = clean(item.description?.html ? stripHtml(item.description.html) : "");
  let dosage = "";

  const detailHtml = await fetchHtml(productUrl);
  if (detailHtml) {
    const tabs = parseTabContent(detailHtml);
    if (tabs.description) description = tabs.description;
    if (tabs.dosage)      dosage       = tabs.dosage;

    // Price from page
    if (!item._resolvedPrice) {
      item._resolvedPrice = buildPrice(item.price_range, detailHtml);
    }
  }

  const price = item._resolvedPrice || buildPrice(item.price_range);

  return {
    productName:    clean(item.name),
    genericName:    "",
    category:       "",
    subCategory:    "",
    subsubCategory: "",
    productType:    "",
    description:    description.substring(0, 3000),
    dosage:         dosage.substring(0, 1000),
    productLink:    productUrl,
    imageUrl,
    outofstock:     false,
    variants:       [{ packingVolume: "", customerPrice: price }],
  };
}

// Strip basic HTML tags
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// ── SSE helper ────────────────────────────────────────────────────────────────
function sseEvent(enc: TextEncoder, data: object): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

// ── POST ──────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 12;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { url, page = 1 } = body as { url?: string; page?: number };

  if (!url) return new Response(JSON.stringify({ error: "URL is required" }), { status: 400 });

  let parsed: URL;
  try { parsed = new URL(url); } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400 });
  }

  // Base URL e.g. https://petzone.com/uae/en
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const baseUrl = `${parsed.origin}/${pathParts[0]}/${pathParts[1]}`; // /uae/en

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(sseEvent(enc, data)); } catch { /* disconnected */ }
      };

      try {
        send({ type: "status", message: "Resolving category…" });

        const category = await resolveCategoryId(url, baseUrl);
        if (!category) {
          send({ type: "error", message: "Could not find this category in Petzone's catalog." });
          controller.close(); return;
        }

        send({ type: "status", message: `Fetching products for "${category.name}"…` });

        const { items, totalPages, totalCount } = await fetchProductPage(
          baseUrl, category.id, page, PAGE_SIZE,
        );

        if (!items.length) {
          send({ type: "error", message: "No products found for this category." });
          controller.close(); return;
        }

        send({ type: "total", total: items.length });
        send({ type: "page_info", currentPage: page, totalPages, totalCount });

        // Build products in batches of 3 (each fetches a detail page)
        for (let i = 0; i < items.length; i += 3) {
          const batch = items.slice(i, i + 3);
          const results = await Promise.all(batch.map(item => buildProduct(item, baseUrl)));
          for (const p of results) if (p) send({ type: "product", product: p });
        }

        if (page < totalPages) {
          send({ type: "next_page", url, page: page + 1 });
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
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
  });
}
