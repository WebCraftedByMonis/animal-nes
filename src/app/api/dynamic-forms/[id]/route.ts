import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for updating forms
const updateFormSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  slug: z.string().min(1, 'Slug is required').optional(),
  headerTitle: z.string().optional(),
  headerSubtitle: z.string().optional(),
  paymentRequired: z.boolean().optional(),
  paymentAmount: z.number().optional(),
  paymentAccount: z.string().optional(),
  thankYouMessage: z.string().optional(),
  thankYouButtonText: z.string().optional(),
  thankYouButtonUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  fields: z.array(z.object({
    id: z.string().optional(), // If present, update existing field
    label: z.string().min(1, 'Field label is required'),
    fieldType: z.enum(['text', 'email', 'tel', 'textarea', 'file', 'checkbox', 'select', 'radio']),
    placeholder: z.string().optional(),
    helpText: z.string().optional(),
    isRequired: z.boolean().default(false),
    orderIndex: z.number(),
    options: z.string().optional(),
    validation: z.string().optional(),
    fileAcceptTypes: z.string().optional(),
    maxFileSize: z.number().optional(),
  })).optional(),
});

// GET - Fetch single form by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const form = await prisma.dynamicForm.findUnique({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = updateFormSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { fields, slug, ...formData } = validation.data;

    // Check if form exists
    const existingForm = await prisma.dynamicForm.findUnique({
      where: { id: params.id }
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

    // Update form
    const updatedForm = await prisma.dynamicForm.update({
      where: { id: params.id },
      data: {
        ...formData,
        ...(slug && { slug }),
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
              formId: params.id,
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
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    // Check if form exists
    const form = await prisma.dynamicForm.findUnique({
      where: { id: params.id },
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
      where: { id: params.id }
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
