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

async function handleImageDelete(publicId: string) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    // Don't throw error - continue with database operations
  }
}

async function POST(request: NextRequest) {
  console.log('🚀 POST /api/partner - Request started');
  
  try {
    console.log('📥 Reading request body...');
    const body = await request.json();
    console.log('✅ Request body parsed successfully');
    console.log('📋 Body keys:', Object.keys(body));
    console.log('🖼️ Image data length:', body.image ? body.image.length : 'No image');
    
    console.log('🔍 Validating request data...');
    const validation = createPartnerSchema.safeParse(body);

    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error.errors);
      return NextResponse.json(
        { errors: validation.error.errors },
        { status: 400 }
      );
    }
    console.log('✅ Validation passed');

    const { image, availableDays, startTimeIds, productIds, ...partnerData } = validation.data;
    console.log('📊 Extracted data:');
    console.log('  - Partner data keys:', Object.keys(partnerData));
    console.log('  - Available days:', availableDays);
    console.log('  - Start time IDs:', startTimeIds);
    console.log('  - Product IDs:', productIds);
    console.log('  - Has image:', !!image);
    
    // Check for existing email before proceeding
    if (partnerData.partnerEmail) {
      console.log('🔍 Checking for existing email:', partnerData.partnerEmail);
      const existingPartner = await prisma.partner.findUnique({
        where: {
          partnerEmail: partnerData.partnerEmail
        }
      });
      
      if (existingPartner) {
        console.log('❌ Email already exists for partner ID:', existingPartner.id);
        return NextResponse.json(
          { error: 'Email already exists. Please use a different email address.' },
          { status: 409 }
        );
      }
      console.log('✅ Email is unique');
    }

    // Handle image upload OUTSIDE transaction
    console.log('🖼️ Starting image upload to Cloudinary...');
    const imageResult = await handleImageUpload(image);
    console.log('✅ Image uploaded successfully:', {
      url: imageResult.url,
      publicId: imageResult.publicId
    });

    console.log('💾 Starting database transaction...');
    const newPartner = await prisma.$transaction(async (tx) => {
      console.log('🏗️ Creating partner record...');
      
      const partnerCreateData = {
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
      };
      
      console.log('📝 Partner create data structure:', {
        partnerDataKeys: Object.keys(partnerData),
        hasPartnerImage: !!partnerCreateData.partnerImage,
        availableDaysCount: availableDays.length,
        startTimeConnections: startTimeIds?.length || 0,
        productConnections: productIds?.length || 0
      });

      const partner = await tx.partner.create({
        data: partnerCreateData,
        include: {
          partnerImage: true,
          availableDaysOfWeek: true,
          startTime: true,
          products: true,
        },
      });
      
      console.log('✅ Partner created successfully with ID:', partner.id);
      console.log('📊 Created partner includes:', {
        hasImage: !!partner.partnerImage,
        availableDaysCount: partner.availableDaysOfWeek.length,
        startTimesCount: partner.startTime.length,
        productsCount: partner.products.length
      });
      
      return partner;
    }, {
      timeout: 10000, // Increased timeout
    });

    console.log('🎉 Transaction completed successfully');
    console.log('📤 Returning partner data...');
    
    return NextResponse.json(newPartner, { status: 201 });
    
  } catch (error: unknown) {
    console.error('💥 POST /api/partner - Error occurred:');
    console.error('Error type:', typeof error);
    console.error('Error instance:', error instanceof Error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error:', error);
    }
    
    // Additional Prisma-specific error logging
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Prisma error code:', (error as any).code);
      console.error('Prisma error meta:', (error as any).meta);
      
      // Handle Prisma unique constraint violations
      if ((error as any).code === 'P2002') {
        const meta = (error as any).meta;
        if (meta && meta.target && meta.target.includes('partnerEmail')) {
          return NextResponse.json(
            { error: 'Email already exists. Please use a different email address.' },
            { status: 409 }
          );
        }
      }
    }
    
    // Additional Cloudinary error logging
    if (error && typeof error === 'object' && 'http_code' in error) {
      console.error('Cloudinary error:', {
        http_code: (error as any).http_code,
        message: (error as any).message
      });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('📤 Returning error response:', errorMessage);
    
    return NextResponse.json(
      { error: `Failed to create partner: ${errorMessage}` },
      { status: 500 }
    );
  }
}

const PARTNER_TYPE_GROUPS = {
  veterinarian: ['Veterinarian (Clinic, Hospital, Consultant)'],
  sales: [
    'Sales and Marketing (Dealer, Distributor, Sales Person)',
    'Sales and Marketing ( dealer , distributor , sales person)' 
  ],
 
} as const;

type PartnerTypeGroup = keyof typeof PARTNER_TYPE_GROUPS;

async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = Number(searchParams.get('page')) || 1;
    const limitParam = searchParams.get('limit') || 'all';
    const limit = limitParam === 'all' ? undefined : Math.min(Number(limitParam), 100);
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';
    const skip = limit ? (page - 1) * limit : undefined;
    
    // Partner type filtering
    const partnerTypeGroup = searchParams.get('partnerTypeGroup') as PartnerTypeGroup | null;
    const specificPartnerType = searchParams.get('partnerType');
    
    // Build where clause
    const whereClause: any = {
      ...(search && { partnerName: { contains: search, } }),
    };
    
    // Apply partner type filtering
    if (partnerTypeGroup && PARTNER_TYPE_GROUPS[partnerTypeGroup]) {
      whereClause.partnerType = {
        in: PARTNER_TYPE_GROUPS[partnerTypeGroup]
      };
    } else if (specificPartnerType) {
      whereClause.partnerType = specificPartnerType;
    }
    
    // Add any additional filters (example)
    const specialization = searchParams.get('specialization');
    if (specialization) {
      whereClause.specialization = { contains: specialization,  };
    }
    
    const species = searchParams.get('species');
    if (species) {
      whereClause.species = species;
    }
    
    // Execute queries
    const [partners, total] = await Promise.all([
      prisma.partner.findMany({
        where: whereClause,
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
        where: whereClause,
      }),
    ]);
    
    return NextResponse.json({
      data: partners,
      meta: {
        total,
        page,
        limit: limit || 'all',
        totalPages: limit ? Math.ceil(total / limit) : 1,
        filters: {
          partnerTypeGroup,
          partnerType: specificPartnerType,
          search,
          specialization,
          species,
        }
      }
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partners' },
      { status: 500 }
    );
  }
}

// TypeScript types for frontend
export type PartnerFilters = {
  page?: number;
  limit?: number | 'all';
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
  partnerTypeGroup?: 'veterinarian' | 'sales';
  partnerType?: string;
  specialization?: string;
  species?: string;
};

async function PUT(request: NextRequest) {
  try {
    console.log('Received PUT request:', request.url);

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    console.log('Partner ID from query params:', idParam);

    const id = Number(idParam);
    if (!id || Number.isNaN(id)) {
      console.error('Invalid or missing Partner ID:', idParam);
      return NextResponse.json(
        { error: 'Valid partner ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log('Request Body:', body);

    const validation = updatePartnerSchema.safeParse(body);
    if (!validation.success) {
      console.error('Validation errors:', validation.error.errors);
      return NextResponse.json(
        { errors: validation.error.errors },
        { status: 400 }
      );
    }

    const { image, availableDays, startTimeIds, productIds, ...updateData } = validation.data;
    console.log('Validated Update Data:', updateData);
    console.log('Image Data:', image);
    console.log('Available Days:', availableDays);
    console.log('Start Time IDs:', startTimeIds);
    console.log('Product IDs:', productIds);

    // Step 1: Get existing partner data OUTSIDE transaction
    console.log('Fetching existing partner with ID:', id);
    const existing = await prisma.partner.findUnique({
      where: { id },
      include: { partnerImage: true },
    });

    if (!existing) {
      console.error('Partner not found with ID:', id);
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    console.log('Existing Partner:', existing);

    // Step 2: Handle image operations OUTSIDE transaction
    let imageResult = null;
    if (image) {
      console.log('Processing image update...');
      
      // Delete old image first (if exists)
      if (existing.partnerImage?.publicId) {
        console.log('Deleting old image from Cloudinary:', existing.partnerImage.publicId);
        await handleImageDelete(existing.partnerImage.publicId);
      }

      // Upload new image
      console.log('Uploading new image...');
      imageResult = await handleImageUpload(image);
      console.log('Image upload result:', imageResult);
    }

    // Step 3: Update partner data in fast transaction
    console.log('Updating Partner in DB...');
    const updatedPartner = await prisma.$transaction(async (tx) => {
      // Update basic partner data
      const updated = await tx.partner.update({
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
        },
        include: {
          partnerImage: true,
          availableDaysOfWeek: true,
          startTime: true,
          products: true,
        },
      });

      // Update available days if provided
      if (availableDays) {
        await tx.partner.update({
          where: { id },
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

      // Update start times if provided
      if (startTimeIds) {
        await tx.partner.update({
          where: { id },
          data: {
            startTime: {
              set: startTimeIds.map(timeId => ({ id: timeId })),
            },
          },
        });
      }

      // Update products if provided
      if (productIds) {
        await tx.partner.update({
          where: { id },
          data: {
            products: {
              set: productIds.map(productId => ({ id: productId })),
            },
          },
        });
      }

      // Return updated partner with all relations
      const finalPartner = await tx.partner.findUnique({
        where: { id },
        include: {
          partnerImage: true,
          availableDaysOfWeek: true,
          startTime: true,
          products: true,
        },
      });

      return finalPartner;
    }, {
      timeout: 15000, // Increased timeout as backup
    });

    console.log('Updated Partner:', updatedPartner);
    console.log('PUT request completed successfully');
    return NextResponse.json(updatedPartner);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error updating partner:', errorMessage, error);

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

    // Step 1: Get partner data OUTSIDE transaction
    const partner = await prisma.partner.findUnique({
      where: { id },
      include: { partnerImage: true },
    });

    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Step 2: Delete image from Cloudinary OUTSIDE transaction
    if (partner.partnerImage?.publicId) {
      await handleImageDelete(partner.partnerImage.publicId);
    }

    // Step 3: Delete partner from database in fast transaction
    await prisma.$transaction(async (tx) => {
      await tx.partner.delete({
        where: { id },
      });
    }, {
      timeout: 10000,
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