import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { validateCompanySession } from '@/lib/auth/company-auth';
import { uploadImage } from '@/lib/cloudinary';
import { checkRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function getCompanyFromSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('company-token')?.value;
  if (!token) return null;
  try {
    const company = await validateCompanySession(token);
    return company;
  } catch {
    return null;
  }
}

// POST - a company requests to sponsor (boost) one of its own products.
// Lands as PENDING_PAYMENT until an admin verifies the payment screenshot
// and approves it — see /api/admin/sponsorships.
export async function POST(request: NextRequest) {
  try {
    const company = await getCompanyFromSession();
    if (!company) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allowed } = await checkRateLimit(`sponsorship-submit:company:${company.id}`, 10, 60 * 60);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests this hour. Please try again later.' }, { status: 429 });
    }

    const formData = await request.formData();
    const productId = Number(formData.get('productId'));
    const durationDays = Number(formData.get('durationDays'));
    const paymentMethod = (formData.get('paymentMethod') as string) || null;
    const screenshotFile = formData.get('paymentScreenshot') as File | null;

    if (!productId || !durationDays) {
      return NextResponse.json({ error: 'A product and duration are required' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.companyId !== company.id) {
      return NextResponse.json({ error: 'That product does not belong to your account' }, { status: 403 });
    }

    const settings = await prisma.sponsorshipSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    if (durationDays < settings.minDays || durationDays > settings.maxDays) {
      return NextResponse.json(
        { error: `Duration must be between ${settings.minDays} and ${settings.maxDays} days` },
        { status: 400 }
      );
    }

    const rate = company.country === 'UAE' ? settings.pricePerDayAED : settings.pricePerDay;
    const amount = rate * durationDays;

    let screenshotUrl: string | null = null;
    let screenshotPublicId: string | null = null;
    if (screenshotFile && screenshotFile.size > 0) {
      const buffer = Buffer.from(await screenshotFile.arrayBuffer());
      const result = await uploadImage(buffer, 'sponsorship-payments');
      screenshotUrl = result.secure_url;
      screenshotPublicId = result.public_id;
    }

    const sponsorship = await prisma.productSponsorship.create({
      data: {
        productId,
        companyId: company.id,
        requestedByRole: 'COMPANY',
        durationDays,
        amount,
        paymentMethod,
        paymentScreenshotUrl: screenshotUrl,
        paymentScreenshotPublicId: screenshotPublicId,
        status: 'PENDING_PAYMENT',
      },
    });

    return NextResponse.json(
      { ...sponsorship, message: 'Sponsorship request submitted — pending admin review.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting company sponsorship:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Submission failed' },
      { status: 500 }
    );
  }
}
