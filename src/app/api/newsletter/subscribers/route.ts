import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [newsletterSubs, users, partners, companies] = await Promise.all([
      (prisma as any).newsletterSubscriber.findMany({ orderBy: { subscribedAt: "desc" } }),
      prisma.user.findMany({ where: { email: { not: null } }, select: { id: true, email: true, name: true, createdAt: true } }),
      prisma.partner.findMany({ select: { id: true, partnerEmail: true, partnerName: true, createdAt: true } }),
      prisma.company.findMany({ select: { id: true, email: true, companyName: true, createdAt: true } }),
    ]);

    // Merge all into one list, deduplicated by email
    const emailMap = new Map<string, any>();

    for (const s of newsletterSubs)
      if (s.email) emailMap.set(s.email.toLowerCase(), { id: s.id, email: s.email, name: s.name, source: "Newsletter", subscribedAt: s.subscribedAt });
    for (const u of users)
      if (u.email && !emailMap.has(u.email.toLowerCase())) emailMap.set(u.email.toLowerCase(), { id: u.id, email: u.email, name: u.name, source: "User", subscribedAt: u.createdAt });
    for (const p of partners)
      if (p.partnerEmail && !emailMap.has(p.partnerEmail.toLowerCase())) emailMap.set(p.partnerEmail.toLowerCase(), { id: p.id, email: p.partnerEmail, name: p.partnerName, source: "Partner", subscribedAt: p.createdAt });
    for (const c of companies)
      if (c.email && !emailMap.has(c.email.toLowerCase())) emailMap.set(c.email.toLowerCase(), { id: c.id, email: c.email, name: c.companyName, source: "Company", subscribedAt: c.createdAt });

    const subscribers = [...emailMap.values()];
    return NextResponse.json({ success: true, subscribers, total: subscribers.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await (prisma as any).newsletterSubscriber.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
