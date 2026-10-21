import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toProductUrl } from '@/lib/slug-utils';
import { getSiteUrl } from '@/lib/site-url';

// Target of middleware.ts's rewrite for legacy /products/{id} URLs. The
// visitor never sees this path: they requested /products/{id} and get a
// 301 straight to the product's current canonical URL. Built on
// getSiteUrl() rather than the request URL, which is localhost behind nginx.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id: Number(id) },
    select: { id: true, productName: true, category: true },
  });

  if (!product) {
    return new NextResponse('Not Found', { status: 404 });
  }

  return NextResponse.redirect(new URL(toProductUrl(product), getSiteUrl()), 301);
}
