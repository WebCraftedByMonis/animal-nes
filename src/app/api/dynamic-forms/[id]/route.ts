import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { uploadImage, deleteFromCloudinary } from '@/lib/cloudinary';

// Validation schema for updating forms
const updateFormSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().nullable().optional().transform(val => val || null),
  slug: z.string().min(1, 'Slug is required').optional(),
  headerTitle: z.string().nullable().optional().transform(val => val || null),
  headerSubtitle: z.string().nullable().optional().transform(val => val || null),
  paymentRequired: z.boolean().optional(),
  paymentAmount: z.number().nullable().optional(),
  paymentAccount: z.string().nullable().optional().transform(val => val || null),
  thankYouMessage: z.string().nullable().optional().transform(val => val || null),
  thankYouButtonText: z.string().nullable().optional().transform(val => val || null),
  thankYouButtonUrl: z.string().nullable().optional().transform(val => val || null),
  isActive: z.boolean().optional(),
  fields: z.array(z.object({
    id: z.string().optional(), // If present, update existing field
    label: z.string().min(1, 'Field label is required'),
    fieldType: z.enum(['text', 'email', 'tel', 'textarea', 'file', 'checkbox', 'select', 'radio']),
    placeholder: z.string().nullable().optional().transform(val => val || null),
    helpText: z.string().nullable().optional().transform(val => val || null),
    isRequired: z.boolean().default(false),
    orderIndex: z.number(),
    options: z.string().nullable().optional().transform(val => val || null),
    validation: z.string().nullable().optional().transform(val => val || null),
    fileAcceptTypes: z.string().nullable().optional().transform(val => val || null),
    maxFileSize: z.number().nullable().optional(),
  })).optional(),
});

// GET - Fetch single form by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params object first
    const { id } = await params;
    const form = await prisma.dynamicForm.findUnique({
      where: { id },
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
      }
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ form });

  } catch (error) {
    console.error('Error fetching form:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form' },
      { status: 500 }
    );
  }
}

// PUT - Update form
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params object first
    const { id } = await params;

    const formData = await request.formData();
    const dataString = formData.get('data') as string;
    const thumbnailFile = formData.get('thumbnail') as File | null;
    const removeThumbnail = formData.get('removeThumbnail') === 'true';

    // Parse JSON data
    const body = JSON.parse(dataString);

    // Validate request body
    const validation = updateFormSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { fields, slug, ...formInfo } = validation.data;

    // Check if form exists
    const existingForm = await prisma.dynamicForm.findUnique({
      where: { id }
    });

    if (!existingForm) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // If slug is being changed, check if new slug already exists
    if (slug && slug !== existingForm.slug) {
      const slugExists = await prisma.dynamicForm.findUnique({
        where: { slug }
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'A form with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Handle thumbnail upload
    let thumbnailUrl = existingForm.thumbnailUrl;
    let thumbnailPublicId = existingForm.thumbnailPublicId;

    if (removeThumbnail && existingForm.thumbnailPublicId) {
      // Delete old thumbnail from Cloudinary
      await deleteFromCloudinary(existingForm.thumbnailPublicId);
      thumbnailUrl = null;
      thumbnailPublicId = null;
    } else if (thumbnailFile && thumbnailFile.size > 0) {
      // Delete old thumbnail if exists
      if (existingForm.thumbnailPublicId) {
        await deleteFromCloudinary(existingForm.thumbnailPublicId);
      }
      // Upload new thumbnail
      const arrayBuffer = await thumbnailFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const uploadResult = await uploadImage(buffer, 'forms/thumbnails', thumbnailFile.name);
      thumbnailUrl = uploadResult.secure_url;
      thumbnailPublicId = uploadResult.public_id;
    }

    // Update form
    const updatedForm = await prisma.dynamicForm.update({
      where: { id },
      data: {
        ...formInfo,
        ...(slug && { slug }),
        thumbnailUrl,
        thumbnailPublicId,
      },
      include: {
        fields: {
          orderBy: {
            orderIndex: 'asc'
          }
        }
      }
    });

    // Handle fields if provided
    if (fields) {
      // Get existing field IDs
      const existingFieldIds = updatedForm.fields.map(f => f.id);
      const incomingFieldIds = fields.filter(f => f.id).map(f => f.id!);

      // Delete fields that are not in the incoming data
      const fieldsToDelete = existingFieldIds.filter(id => !incomingFieldIds.includes(id));
      if (fieldsToDelete.length > 0) {
        await prisma.formField.deleteMany({
          where: {
            id: { in: fieldsToDelete }
          }
        });
      }

      // Update or create fields
      for (const field of fields) {
        if (field.id) {
          // Update existing field
          await prisma.formField.update({
            where: { id: field.id },
            data: {
              label: field.label,
              fieldType: field.fieldType,
              placeholder: field.placeholder,
              helpText: field.helpText,
              isRequired: field.isRequired,
              orderIndex: field.orderIndex,
              options: field.options,
              validation: field.validation,
              fileAcceptTypes: field.fileAcceptTypes,
              maxFileSize: field.maxFileSize,
            }
          });
        } else {
          // Create new field
          await prisma.formField.create({
            data: {
              formId: id,
              label: field.label,
              fieldType: field.fieldType,
              placeholder: field.placeholder,
              helpText: field.helpText,
              isRequired: field.isRequired,
              orderIndex: field.orderIndex,
              options: field.options,
              validation: field.validation,
              fileAcceptTypes: field.fileAcceptTypes,
              maxFileSize: field.maxFileSize,
            }
          });
        }
      }
    }

    // Fetch updated form with fields
    const finalForm = await prisma.dynamicForm.findUnique({
      where: { id },
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
      message: 'Form updated successfully',
      form: finalForm
    });

  } catch (error) {
    console.error('Error updating form:', error);
    return NextResponse.json(
      { error: 'Failed to update form' },
      { status: 500 }
    );
  }
}

// DELETE - Delete form
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params object first
    const { id } = await params;
    // Check if form exists
    const form = await prisma.dynamicForm.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            submissions: true
          }
        }
      }
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // Delete form (cascade will handle fields and submissions)
    await prisma.dynamicForm.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Form deleted successfully',
      submissionsDeleted: form._count.submissions
    });

  } catch (error) {
    console.error('Error deleting form:', error);
    return NextResponse.json(
      { error: 'Failed to delete form' },
      { status: 500 }
    );
  }
}
