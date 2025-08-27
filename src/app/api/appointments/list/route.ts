// src/app/api/appointments/list/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const query = searchParams.get("q") || "";
  const sortBy = searchParams.get("sortBy") || "appointmentAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const where = {
    OR: query
      ? [
        { doctor: { contains: query, } },
        { species: { contains: query, } },
        { city: { contains: query, } },
        { state: { contains: query, } },
        { fullAddress: { contains: query, } },
        { customer: { name: { contains: query, } } },
        { customer: { email: { contains: query, } } },
        { description: { contains: query, } },
      ]
      : undefined,
  };

  const total = await prisma.appointmentRequest.count({ where });

  const data = await prisma.appointmentRequest.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      customer: {
        select: { name: true, email: true },
      },
      paymentInfo: true,
      historyForm: {
        select: { id: true }, // Just get the ID
      },
    },

  });

  return Response.json({
    data,
    total,
    page,
    limit,
  });
}
