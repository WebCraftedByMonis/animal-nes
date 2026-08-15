import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { validateAffiliateSession } from '@/lib/auth/affiliate-auth';
import { toProductUrl } from '@/lib/slug-utils';

async function requireAffiliate(request: NextRequest) {
  const token = request.cookies.get('affiliate-token')?.value;
  if (!token) return null;
  return validateAffiliateSession(token);
}

async function generateLinkCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = crypto.randomBytes(6).toString('base64url').slice(0, 8);
    const existing = await prisma.affiliateLink.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error('Failed to generate a unique link code');
}

export async function GET(request: NextRequest) {
  const affiliate = await requireAffiliate(request);
  if (!affiliate) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const links = await prisma.affiliateLink.findMany({
    where: { affiliatePartnerId: affiliate.id },
    include: {
      product: { select: { id: true, productName: true } },
      _count: { select: { clicks: true, conversions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    links: links.map((l) => ({
      id: l.id,
      code: l.code,
      label: l.label,
      isActive: l.isActive,
      productId: l.productId,
      productName: l.product?.productName || null,
      targetPath: l.targetPath,
      clickCount: l._count.clicks,
      conversionCount: l._count.conversions,
      createdAt: l.createdAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const affiliate = await requireAffiliate(request);
  if (!affiliate) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (affiliate.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Your affiliate account must be approved first' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const productId = typeof body.productId === 'number' ? body.productId : undefined;
  const label = typeof body.label === 'string' ? body.label.slice(0, 100) : undefined;

  let targetPath = '/';
  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, productName: true, category: true, isActive: true },
    });
    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    targetPath = toProductUrl(product);
  }

  const code = await generateLinkCode();

  const link = await prisma.affiliateLink.create({
    data: {
      code,
      affiliatePartnerId: affiliate.id,
      productId: productId ?? null,
      targetPath,
      label: label || null,
    },
  });

  return NextResponse.json({
    link: {
      id: link.id,
      code: link.code,
      url: `${request.nextUrl.origin}/go/${link.code}`,
      targetPath: link.targetPath,
      productId: link.productId,
      label: link.label,
      createdAt: link.createdAt,
    },
  }, { status: 201 });
}
