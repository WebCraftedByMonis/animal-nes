import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const existing = await (prisma as any).newsletterSubscriber.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Already subscribed" }, { status: 409 });
    }

    await (prisma as any).newsletterSubscriber.create({ data: { id: crypto.randomUUID(), email, name: name || null } });
    return NextResponse.json({ success: true, message: "Subscribed successfully" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
