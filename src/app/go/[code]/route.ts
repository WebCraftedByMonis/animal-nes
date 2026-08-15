// Outbound affiliate click redirect. This is the "major conversion event"
// entry point: it records a rich AffiliateClick row for attribution AND logs
// a generic AFFILIATE_CLICK row into the central TrackingEvent table so it
// shows up alongside every other event type in the analytics dashboard.
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { toProductUrl } from '@/lib/slug-utils';
import { trackEvent, getSessionIdFromRequest } from '@/lib/tracking';
import { getAffiliateSettings } from '@/lib/affiliateLedger';

const ATTRIBUTION_COOKIE = 'aw_aff';

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex');
}

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const baseUrl = req.nextUrl.origin;

  const link = await prisma.affiliateLink.findUnique({
    where: { code },
    include: {
      affiliatePartner: { select: { id: true, status: true } },
      product: { select: { id: true, productName: true, category: true } },
    },
  });

  if (!link || !link.isActive || link.affiliatePartner.status !== 'APPROVED') {
    return NextResponse.redirect(new URL('/', baseUrl));
  }

  const targetUrl = link.product ? toProductUrl(link.product) : link.targetPath || '/';
  const clickToken = crypto.randomUUID();

  const click = await prisma.affiliateClick.create({
    data: {
      linkId: link.id,
      affiliatePartnerId: link.affiliatePartnerId,
      productId: link.productId,
      clickToken,
      ipHash: hashIp(getClientIp(req)),
      userAgent: req.headers.get('user-agent') || null,
      referrer: req.headers.get('referer') || null,
      landingPath: targetUrl,
    },
  });

  await trackEvent({
    type: 'AFFILIATE_CLICK',
    sessionId: getSessionIdFromRequest(req),
    productId: link.productId,
    affiliateLinkId: link.id,
    affiliateClickId: click.id,
    path: targetUrl,
    referrer: req.headers.get('referer') || undefined,
  });

  const settings = await getAffiliateSettings();

  const response = NextResponse.redirect(new URL(targetUrl, baseUrl));
  response.cookies.set(ATTRIBUTION_COOKIE, clickToken, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * settings.cookieWindowDays,
    path: '/',
  });

  return response;
}
