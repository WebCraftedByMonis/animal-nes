// app/api/users/route.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "10");
  const search = searchParams.get("search")?.toLowerCase() || "";
  const range = searchParams.get("range") || "all";

  const skip = (page - 1) * pageSize;

  const now = new Date();
  const today = new Date(now.setHours(0, 0, 0, 0));
  const last7Days = new Date();
  last7Days.setDate(now.getDate() - 6);

  const startDate =
    range === "today"
      ? today
      : range === "7days"
      ? last7Days
      : range === "month"
      ? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      : undefined;

  const whereClause = {
    AND: [
      search
        ? {
            OR: [
              { name: { contains: search,  } },
              { email: { contains: search,} },
            ],
          }
        : {},
      startDate
        ? {
            sessions: {
              some: {
                createdAt: { gte: startDate },
              },
            },
          }
        : {},
    ],
  };

  const total = await prisma.user.count({ where: whereClause });

  const users = await prisma.user.findMany({
    skip,
    take: pageSize,
    orderBy: { name: "asc" },
    where: whereClause,
    include: {
      sessions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return NextResponse.json({ users, total });
}
