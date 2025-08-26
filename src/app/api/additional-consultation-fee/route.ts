import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

const prisma = new PrismaClient();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const prescriptionId = formData.get('prescriptionId') as string;
    const consultationFee = parseFloat(formData.get('consultationFee') as string);
    const feeDescription = formData.get('feeDescription') as string;
    const paymentMethod = formData.get('paymentMethod') as string;
    const screenshotFile = formData.get('screenshot') as File | null;

    // Validation
    if (!prescriptionId || !consultationFee || !feeDescription || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate prescription exists
    const prescription = await prisma.prescriptionForm.findUnique({
      where: { id: parseInt(prescriptionId) },
      include: {
        historyForm: {
          include: {
            appointment: true
          }
        }
      }
    });

    if (!prescription) {
      return NextResponse.json(
        { error: 'Prescription not found' },
        { status: 404 }
      );
    }

    let screenshotUrl = null;
    let screenshotPublicId = null;

    // Upload screenshot to Cloudinary if provided
    if (screenshotFile && paymentMethod !== 'cod') {
      try {
        const bytes = await screenshotFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const uploadResult = await new Promise<any>((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              folder: 'additional-consultation-fees',
              public_id: `additional_fee_${prescriptionId}_${Date.now()}`,
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(buffer);
        });

        screenshotUrl = uploadResult.secure_url;
        screenshotPublicId = uploadResult.public_id;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload screenshot' },
          { status: 500 }
        );
      }
    }

    // Create additional consultation fee record
    const additionalFee = await prisma.additionalConsultationFee.create({
      data: {
        prescriptionId: parseInt(prescriptionId),
        consultationFee,
        feeDescription,
        paymentMethod,
        screenshotUrl,
        screenshotPublicId,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      data: additionalFee,
    });

  } catch (error) {
    console.error('Error creating additional consultation fee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('q') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        {
          prescription: {
            ownerName: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          prescription: {
            doctorName: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          feeDescription: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }

    const [additionalFees, total] = await Promise.all([
      prisma.additionalConsultationFee.findMany({
        where: whereClause,
        include: {
          prescription: {
            include: {
              historyForm: {
                include: {
                  appointment: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.additionalConsultationFee.count({ where: whereClause })
    ]);

    return NextResponse.json({
      data: additionalFees,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error fetching additional consultation fees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}