import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { uploadImage, deleteFromCloudinary } from '@/lib/cloudinary';

// Validation schema for creating/updating forms
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional().transform(val => val || null),
  slug: z.string().min(1, 'Slug is required'),
  headerTitle: z.string().nullable().optional().transform(val => val || null),
  headerSubtitle: z.string().nullable().optional().transform(val => val || null),
  paymentRequired: z.boolean().default(false),
  paymentAmount: z.number().nullable().optional(),
  paymentAccount: z.string().nullable().optional().transform(val => val || null),
  thankYouMessage: z.string().nullable().optional().transform(val => val || null),
  thankYouButtonText: z.string().nullable().optional().transform(val => val || null),
  thankYouButtonUrl: z.string().nullable().optional().transform(val => val || null),
  isActive: z.boolean().default(true),
  fields: z.array(z.object({
    label: z.string().min(1, 'Field label is required'),
    fieldType: z.enum(['text', 'email', 'tel', 'textarea', 'file', 'checkbox', 'select', 'radio']),
    placeholder: z.string().nullable().optional().transform(val => val || null),
    helpText: z.string().nullable().optional().transform(val => val || null),
    isRequired: z.boolean().default(false),
    orderIndex: z.number(),
    options: z.string().nullable().optional().transform(val => val || null), // JSON string
    validation: z.string().nullable().optional().transform(val => val || null), // JSON string
    fileAcceptTypes: z.string().nullable().optional().transform(val => val || null),
    maxFileSize: z.number().nullable().optional(),
  })).optional(),
});

// GET - Fetch all forms
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }

    const forms = await prisma.dynamicForm.findMany({
      where,
      include: {
        fields: {
          orderBy: {
            orderIndex: 'asc'
          }
        },
        _count: {
          select: {
            submissions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ forms });

  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}

// POST - Create new form
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const dataString = formData.get('data') as string;
    const thumbnailFile = formData.get('thumbnail') as File | null;

    // Parse JSON data
    const body = JSON.parse(dataString);

    // Validate request body
    const validation = formSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { fields, ...formInfo } = validation.data;

    // Check if slug already exists
    const existingForm = await prisma.dynamicForm.findUnique({
      where: { slug: formInfo.slug }
    });

    if (existingForm) {
      return NextResponse.json(
        { error: 'A form with this slug already exists' },
        { status: 400 }
      );
    }

    // Upload thumbnail to Cloudinary if provided
    let thumbnailUrl = null;
    let thumbnailPublicId = null;

    if (thumbnailFile && thumbnailFile.size > 0) {
      const arrayBuffer = await thumbnailFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const uploadResult = await uploadImage(buffer, 'forms/thumbnails', thumbnailFile.name);
      thumbnailUrl = uploadResult.secure_url;
      thumbnailPublicId = uploadResult.public_id;
    }

    // Create form with fields
    const form = await prisma.dynamicForm.create({
      data: {
        ...formInfo,
        thumbnailUrl,
        thumbnailPublicId,
        fields: fields ? {
          create: fields
        } : undefined
      },
      include: {
        fields: {
          orderBy: {
            orderIndex: 'asc'
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Form created successfully',
      form
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating form:', error);
    return NextResponse.json(
      { error: 'Failed to create form' },
      { status: 500 }
    );
  }
}
