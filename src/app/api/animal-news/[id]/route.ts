// /app/api/animal-news/[id]/route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    // Await the params object first
    const { id: idString } = await params;
    const id = Number(idString); // Convert string to number
  
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
  
    try {
      const news = await prisma.animalNews.findUnique({
        where: { id }, // Now it's a number
        select: {
          id: true,
          title: true,
          description: true,
          image: {
            select: { url: true, alt: true },
          },
          pdf: {
            select: { url: true },
          },
        },
      });
  
      if (!news) {
        return NextResponse.json({ error: "News not found" }, { status: 404 });
      }
  
      return NextResponse.json(news);
    } catch (error) {
      console.error("Error fetching news:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  }
  