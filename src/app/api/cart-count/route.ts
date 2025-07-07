import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ count: 0 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { cart: true },
  });

  const count = user?.cart.length || 0;
  return NextResponse.json({ count });
}
