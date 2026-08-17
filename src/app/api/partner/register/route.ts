// app/api/partner/register/route.ts
// Public vendor sign-up. Unlike POST /api/partner (admin-only, creates a
// partner that can log in immediately), this route is reachable without an
// admin session and always creates the partner in a PENDING state — an
// admin has to approve it from the dashboard before it can sign in or show
// up anywhere on the public site.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { uploadImage } from '@/lib/cloudinary';
import { hashPassword } from '@/lib/auth/partner-auth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Vendors signing up through this public form are always the "Sales and
// Marketing (Dealer, Distributor, Sales Person)" partner type — this isn't
// the general partner form used for onboarding vets, farmers, students, etc.
const VENDOR_PARTNER_TYPE = 'Sales and Marketing (Dealer, Distributor, Sales Person)';

const genderEnum = ['MALE', 'FEMALE'] as const;
const bloodGroupEnum = [
  'A_POSITIVE', 'B_POSITIVE', 'A_NEGATIVE', 'B_NEGATIVE',
  'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'
] as const;
const dayEnum = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

const registerVendorSchema = z.object({
  partnerName: z.string().min(1),
  gender: z.enum(genderEnum).optional(),
  partnerEmail: z.string().email().optional(),
  partnerMobileNumber: z.string().optional(),
  shopName: z.string().optional(),
  cityName: z.string().optional(),
  country: z.string().optional(),
  fullAddress: z.string().optional(),
  rvmpNumber: z.string().optional(),
  qualificationDegree: z.string().optional(),
  zipcode: z.string().optional(),
  state: z.string().optional(),
  areaTown: z.string().optional(),
  password: z.string().min(6),
  bloodGroup: z.enum(bloodGroupEnum).optional(),
  availableDays: z.array(z.enum(dayEnum)).min(1),
  specialization: z.string().optional(),
  image: z.string().min(1, 'Image is required'),
  referralCode: z.string().optional(),
});

async function handleImageUpload(image: string) {
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const result = await uploadImage(buffer, 'partners');
  return { url: result.secure_url, publicId: result.public_id };
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { allowed } = await checkRateLimit(`vendor-register:${ip}`, 5, 60 * 60);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many sign-up attempts from this device. Please try again in an hour.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = registerVendorSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.errors }, { status: 400 });
    }

    const { image, availableDays, referralCode, ...partnerData } = validation.data;

    if (partnerData.partnerEmail) {
      const existingPartner = await prisma.partner.findUnique({
        where: { partnerEmail: partnerData.partnerEmail },
      });
      if (existingPartner) {
        return NextResponse.json(
          { error: 'Email already exists. Please use a different email address.' },
          { status: 409 }
        );
      }
    }

    let referrerId: number | null = null;
    if (referralCode) {
      const referrer = await prisma.partner.findUnique({
        where: { referralCode },
        select: { id: true },
      });
      if (referrer) referrerId = referrer.id;
    }

    const hashedPassword = await hashPassword(partnerData.password);
    const imageResult = await handleImageUpload(image);

    const newPartner = await prisma.$transaction(async (tx) => {
      return tx.partner.create({
        data: {
          ...partnerData,
          password: hashedPassword,
          partnerType: VENDOR_PARTNER_TYPE,
          approvalStatus: 'PENDING',
          referredById: referrerId,
          partnerImage: {
            create: { url: imageResult.url, publicId: imageResult.publicId },
          },
          availableDaysOfWeek: {
            createMany: { data: availableDays.map((day) => ({ day })) },
          },
        },
        select: { id: true, partnerName: true, partnerEmail: true },
      });
    }, { timeout: 10000 });

    return NextResponse.json(
      {
        ...newPartner,
        message: 'Your vendor account request has been submitted and is pending admin approval.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('POST /api/partner/register error:', error);

    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'P2002') {
      return NextResponse.json(
        { error: 'Email already exists. Please use a different email address.' },
        { status: 409 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to submit vendor registration: ${errorMessage}` },
      { status: 500 }
    );
  }
}
