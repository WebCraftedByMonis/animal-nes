import { NextRequest, NextResponse } from 'next/server';
import { validatePartnerSession } from '@/lib/auth/partner-auth';
import { prisma } from '@/lib/prisma';
import { uploadImage, deleteFromCloudinary } from '@/lib/cloudinary';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 60;

const genderEnum = ['MALE', 'FEMALE'] as const;
const dayEnum = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

const updateProfileSchema = z.object({
  partnerName: z.string().min(1).optional(),
  partnerEmail: z.string().email().optional(),
  partnerMobileNumber: z.string().optional(),
  shopName: z.string().optional(),
  cityName: z.string().optional(),
  fullAddress: z.string().optional(),
  gender: z.enum(genderEnum).optional(),
  state: z.string().optional(),
  zipcode: z.string().optional(),
  areaTown: z.string().optional(),
  qualificationDegree: z.string().optional(),
  specialization: z.string().optional(),
  partnerType: z.string().optional(),
  rvmpNumber: z.string().optional(),
  availableDays: z.array(z.enum(dayEnum)).optional(),
  image: z.string().optional(),
});

async function handleImageUpload(image: string) {
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  const result = await uploadImage(buffer, 'partners');
  return { url: result.secure_url, publicId: result.public_id };
}

export async function PUT(request: NextRequest) {
  try {
    // Validate partner session
    const token = request.cookies.get('partner-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const partnerSession = await validatePartnerSession(token);

    if (!partnerSession) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.errors },
        { status: 400 }
      );
    }

    const { image, availableDays, ...updateData } = validation.data;

    // Check if email is being changed and if it's already taken
    if (updateData.partnerEmail && updateData.partnerEmail !== partnerSession.partnerEmail) {
      const existingPartner = await prisma.partner.findUnique({
        where: { partnerEmail: updateData.partnerEmail },
      });

      if (existingPartner && existingPartner.id !== partnerSession.id) {
        return NextResponse.json(
          { error: 'Email already exists. Please use a different email address.' },
          { status: 409 }
        );
      }
    }

    // Get existing partner data
    const existingPartner = await prisma.partner.findUnique({
      where: { id: partnerSession.id },
      include: { partnerImage: true },
    });

    if (!existingPartner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Handle image upload if provided
    let imageResult = null;
    if (image) {
      // Delete old image
      if (existingPartner.partnerImage?.publicId) {
        try {
          await deleteFromCloudinary(existingPartner.partnerImage.publicId, 'image');
        } catch (error) {
          console.error('Error deleting old image:', error);
        }
      }

      // Upload new image
      imageResult = await handleImageUpload(image);
    }

    // Update partner
    const updatedPartner = await prisma.$transaction(async (tx) => {
      // Update basic data
      const partner = await tx.partner.update({
        where: { id: partnerSession.id },
        data: {
          ...updateData,
          ...(imageResult && {
            partnerImage: {
              upsert: {
                create: {
                  url: imageResult.url,
                  publicId: imageResult.publicId,
                },
                update: {
                  url: imageResult.url,
                  publicId: imageResult.publicId,
                },
              },
            },
          }),
        },
        include: {
          partnerImage: true,
          availableDaysOfWeek: true,
          products: {
            include: {
              image: true,
              variants: true,
              company: true,
            },
          },
        },
      });

      // Update available days if provided
      if (availableDays) {
        await tx.partner.update({
          where: { id: partnerSession.id },
          data: {
            availableDaysOfWeek: {
              deleteMany: {},
              createMany: {
                data: availableDays.map(day => ({ day })),
              },
            },
          },
        });
      }

      // Fetch final partner with all relations
      return tx.partner.findUnique({
        where: { id: partnerSession.id },
        include: {
          partnerImage: true,
          availableDaysOfWeek: true,
          products: {
            include: {
              image: true,
              variants: true,
              company: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      partner: updatedPartner,
    });

  } catch (error) {
    console.error('Error updating partner profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to update profile: ${errorMessage}` },
      { status: 500 }
    );
  }
}
