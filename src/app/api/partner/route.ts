// app/api/partners/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Zod schemas
const genderEnum = ['MALE', 'FEMALE'] as const;
const bloodGroupEnum = [
  'A_POSITIVE', 'B_POSITIVE', 'A_NEGATIVE', 'B_NEGATIVE',
  'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'
] as const;
const sendToPartnerEnum = ['YES', 'NO'] as const;
const dayEnum = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

const createPartnerSchema = z.object({
  partnerName: z.string().min(1),
  gender: z.enum(genderEnum).optional(),
  partnerEmail: z.string().email().optional(),
  partnerMobileNumber: z.string().optional(),
  shopName: z.string().optional(),
  cityName: z.string().optional(),
  fullAddress: z.string().optional(),
  rvmpNumber: z.string().optional(),
  sendToPartner: z.enum(sendToPartnerEnum).optional(),
  qualificationDegree: z.string().optional(),
  zipcode: z.string().optional(),
  state: z.string().optional(),
  areaTown: z.string().optional(),
  password: z.string().min(6),
  bloodGroup: z.enum(bloodGroupEnum).optional(),
  availableDays: z.array(z.enum(dayEnum)).min(1),
  startTimeIds: z.array(z.number().int().positive()).optional(),
  specialization: z.string().optional(),
  species: z.string().optional(),
  partnerType: z.string().optional(),
  productIds: z.array(z.number().int().positive()).optional(),
  image: z.string().min(1, 'Image is required'),
});

const updatePartnerSchema = createPartnerSchema
  .omit({ password: true, image: true })
  .extend({
    password: z.string().min(6).optional(),
    image: z.string().optional(),
  })
  .partial();

async function handleImageUpload(image: string) {
  const result = await cloudinary.uploader.upload(image, {
    folder: 'partners',
  });
  return { url: result.secure_url, publicId: result.public_id };
}

async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = createPartnerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.errors },
        { status: 400 }
      );
    }
   

    const { image, availableDays, startTimeIds, productIds, ...partnerData } = validation.data;
    const imageResult = await handleImageUpload(image);

    const newPartner = await prisma.$transaction(async (tx) => {
      const partner = await tx.partner.create({
        data: {
          ...partnerData,
          partnerImage: {
            create: {
              url: imageResult.url,
              publicId: imageResult.publicId,
            },
          },
          availableDaysOfWeek: {
            createMany: {
              data: availableDays.map(day => ({ day })),
            },
          },
          startTime: startTimeIds?.length ? {
            connect: startTimeIds.map(id => ({ id })),
          } : undefined,
          products: productIds?.length ? {
            connect: productIds.map(id => ({ id })),
          } : undefined,
        },
        include: {
          partnerImage: true,
          availableDaysOfWeek: true,
          startTime: true,
          products: true,
        },
      });
      return partner;
    });

    return NextResponse.json(newPartner, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to create partner: ${errorMessage}` },
      { status: 500 }
    );
  }
}
 async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Number(searchParams.get('page')) || 1;
    const limitParam = searchParams.get('limit') || '10';
    const limit = limitParam === 'all' ? undefined : Math.min(Number(limitParam), 100);

    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    const skip = limit ? (page - 1) * limit : undefined;

    const [partners, total] = await Promise.all([
      prisma.partner.findMany({
        where: { partnerName: { contains: search } },
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: {
          partnerImage: true,
          products: true,
          availableDaysOfWeek: true,
          startTime: true,
        },
      }),
      prisma.partner.count({
        where: { partnerName: { contains: search } },
      }),
    ]);

    return NextResponse.json({
      data: partners,
      total,
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.error();
  }
}

async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    
    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { error: 'Valid partner ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = updatePartnerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.errors },
        { status: 400 }
      );
    }

    const { image, availableDays, startTimeIds, productIds, ...updateData } = validation.data;

    const updatedPartner = await prisma.$transaction(async (tx) => {
      const existing = await tx.partner.findUnique({
        where: { id },
        include: { partnerImage: true },
      });

      if (!existing) {
        throw new Error('Partner not found');
      }

      let imageResult;
      if (image) {
        if (existing.partnerImage?.publicId) {
          await cloudinary.uploader.destroy(existing.partnerImage.publicId);
        }
        imageResult = await handleImageUpload(image);
      }

      return tx.partner.update({
        where: { id },
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
          ...(availableDays && {
            availableDaysOfWeek: {
              deleteMany: {},
              createMany: {
                data: availableDays.map(day => ({ day })),
              },
            },
          }),
          ...(startTimeIds && {
            startTime: {
              set: startTimeIds.map(timeId => ({ id: timeId })),
            },
          }),
          ...(productIds && {
            products: {
              set: productIds.map(productId => ({ id: productId })),
            },
          }),
        },
        include: {
          partnerImage: true,
          availableDaysOfWeek: true,
          startTime: true,
          products: true,
        },
      });
    });

    return NextResponse.json(updatedPartner);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to update partner: ${errorMessage}` },
      { status: 500 }
    );
  }
}

async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    
    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { error: 'Valid partner ID is required' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const partner = await tx.partner.findUnique({
        where: { id },
        include: { partnerImage: true },
      });

      if (!partner) {
        throw new Error('Partner not found');
      }

      if (partner.partnerImage?.publicId) {
        await cloudinary.uploader.destroy(partner.partnerImage.publicId);
      }

      await tx.partner.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to delete partner: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export { POST, GET, PUT, DELETE };