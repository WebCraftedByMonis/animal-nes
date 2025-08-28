import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ count: 0 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { animalCart: true },
  });

  const count = user?.animalCart.length || 0;
  return NextResponse.json({ count });
}