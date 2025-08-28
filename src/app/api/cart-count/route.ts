import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ 
      productCount: 0, 
      animalCount: 0, 
      totalCount: 0 
    });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { 
      cart: true, 
      animalCart: true 
    },
  });

  const productCount = user?.cart.length || 0;
  const animalCount = user?.animalCart.length || 0;
  const totalCount = productCount + animalCount;

  return NextResponse.json({ 
    productCount, 
    animalCount, 
    totalCount,
    // Keep backward compatibility
    count: productCount 
  });
}
