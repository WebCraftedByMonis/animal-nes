import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform    = searchParams.get("platform")    || undefined;
    const contentType = searchParams.get("contentType") || undefined;
    const status      = searchParams.get("status")      || undefined;
    const page        = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit       = 50;
    const skip        = (page - 1) * limit;

    const where: any = {};
    if (platform)    where.platform    = platform;
    if (contentType) where.contentType = contentType;
    if (status)      where.status      = status;

    const [logs, total, summary] = await Promise.all([
      prisma.socialAutoPostLog.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.socialAutoPostLog.count({ where }),
      // Group summary: count per platform + status
      prisma.socialAutoPostLog.groupBy({
        by: ["platform", "status"],
        _count: { id: true },
        orderBy: [{ platform: "asc" }, { status: "asc" }],
      }),
    ]);

    return NextResponse.json({ logs, total, page, limit, summary });
  } catch (error: any) {
    console.error("Social auto post log error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch logs" },
      { status: 500 }
    );
  }
}

// DELETE a single log entry (so it can be re-posted)
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await prisma.socialAutoPostLog.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
