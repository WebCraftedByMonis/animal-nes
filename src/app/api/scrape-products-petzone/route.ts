import { NextRequest } from "next/server";
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

// Strip HTML tags to plain text
function stripHtml(html: string): string {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Price from GraphQL price_range
function buildPrice(priceRange: any): string {
  const val = priceRange?.minimum_price?.final_price?.value;
  if (val != null) return String(Math.round(val));
  return "";
}

// Convert one GraphQL product item → ExtractedProduct (no detail page fetch)
function buildProduct(item: any, baseUrl: string): ExtractedProduct | null {
  if (!item?.name) return null;

  // Build product URL — prefer shortest non-shop-by-pet rewrite
  const rewrites: string[] = (item.url_rewrites || []).map((r: any) => r.url as string);
  const preferred = rewrites.find(u => !/shop-by-pet/i.test(u)) || rewrites[0] || `${item.url_key}.html`;
  const productUrl = `${baseUrl}/${preferred}`;

  // Image
  let imageUrl = item.small_image?.url || "";
  if (imageUrl.startsWith("//")) imageUrl = "https:" + imageUrl;

  const description = stripHtml(item.description?.html || "").substring(0, 3000);
  const price = buildPrice(item.price_range);

  return {
    productName:    clean(item.name),
    genericName:    "",
    category:       "",
    subCategory:    "",
    subsubCategory: "",
    productType:    "",
    description,
    dosage:         "",
    productLink:    productUrl,
    imageUrl,
    outofstock:     false,
    variants:       [{ packingVolume: "", customerPrice: price }],
  };
}

// ── SSE helper ────────────────────────────────────────────────────────────────
function sseEvent(enc: TextEncoder, data: object): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

// ── POST ──────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 48;

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

        // No detail page fetches — build all products directly from GraphQL data
        for (const item of items) {
          const p = buildProduct(item, baseUrl);
          if (p) send({ type: "product", product: p });
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
