import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import https from "https";

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000,
      httpsAgent,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: new URL(url).origin + "/",
        Accept: "image/webp,image/avif,image/*,*/*;q=0.8",
      },
      validateStatus: (s) => s < 500,
    });

    if (res.status >= 400) return new NextResponse("Image not found", { status: res.status });

    const contentType = res.headers["content-type"] || "image/jpeg";
    return new NextResponse(res.data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Failed to fetch image", { status: 502 });
  }
}
