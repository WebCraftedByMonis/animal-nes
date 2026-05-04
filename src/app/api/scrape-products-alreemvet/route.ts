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
  Referer: "https://alreemvet.net/",
};

const clean = (s: string) => (s || "").replace(/\s+/g, " ").trim();
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
      timeout: 25000,
      httpsAgent,
      maxRedirects: 5,
      validateStatus: (s) => s < 500,
    });
    if (res.status >= 400) return { data: null, linkHeader: "" };
    return { data: res.data, linkHeader: String(res.headers["link"] || "") };
  } catch (e: any) {
    return { data: null, linkHeader: "" };
  }
}

function parseNextFromLink(linkHeader: string): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

async function fetchShopifyProducts(origin: string, collectionHandle: string): Promise<ExtractedProduct[]> {
  const products: ExtractedProduct[] = [];
  let url: string | null = `${origin}/collections/${collectionHandle}/products.json?limit=250`;

  while (url) {
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

  return products;
}

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

    const products = await fetchShopifyProducts(origin, collectionHandle);
    if (!products.length)
      return NextResponse.json({ error: "No products found. Check the URL." }, { status: 400 });

    return NextResponse.json({ success: true, count: products.length, totalLinks: products.length, products });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Scraping failed" }, { status: 500 });
  }
}
