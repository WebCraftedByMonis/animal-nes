import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadImage } from '@/lib/cloudinary';

// POST - Submit form
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData();

    // Fetch form with fields
    const form = await prisma.dynamicForm.findUnique({
      where: { id: params.id },
      include: {
        fields: {
          orderBy: {
            orderIndex: 'asc'
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

    if (!form.isActive) {
      return NextResponse.json(
        { error: 'This form is no longer accepting submissions' },
        { status: 400 }
      );
    }

    // Handle payment screenshot if required
    let paymentScreenshotUrl = null;
    let paymentScreenshotPublicId = null;

    if (form.paymentRequired) {
      const screenshotFile = formData.get('paymentScreenshot') as File | null;

      if (!screenshotFile) {
        return NextResponse.json(
          { error: 'Payment screenshot is required' },
          { status: 400 }
        );
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(screenshotFile.type)) {
        return NextResponse.json(
          { error: 'Invalid file type. Only JPEG, JPG, PNG, and WEBP are allowed' },
          { status: 400 }
        );
      }

      // Validate file size (max 10MB)
      if (screenshotFile.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File size must be less than 10MB' },
          { status: 400 }
        );
      }

      try {
        // Convert file to buffer
        const arrayBuffer = await screenshotFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Cloudinary
        const uploadResult = await uploadImage(
          buffer,
          `form-payments/${form.slug}`,
          `payment-${Date.now()}.${screenshotFile.name.split('.').pop()}`
        );

        paymentScreenshotUrl = uploadResult.secure_url;
        paymentScreenshotPublicId = uploadResult.public_id;
      } catch (uploadError) {
        console.error('Error uploading payment screenshot:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload payment screenshot' },
          { status: 500 }
        );
      }
    }

    // Create submission
    const submission = await prisma.formSubmission.create({
      data: {
        formId: form.id,
        paymentScreenshotUrl,
        paymentScreenshotPublicId,
      }
    });

    // Process and save field values
    const fieldValues: any[] = [];

    for (const field of form.fields) {
      const fieldValue = formData.get(`field_${field.id}`);

      // Check if required field is provided
      if (field.isRequired && !fieldValue) {
        return NextResponse.json(
          { error: `${field.label} is required` },
          { status: 400 }
        );
      }

      if (fieldValue) {
        if (field.fieldType === 'file') {
          // Handle file uploads
          const file = fieldValue as File;

          // Validate file type if specified
          if (field.fileAcceptTypes) {
            const acceptedTypes = field.fileAcceptTypes.split(',').map(t => t.trim());
            if (!acceptedTypes.includes(file.type)) {
              return NextResponse.json(
                { error: `Invalid file type for ${field.label}` },
                { status: 400 }
              );
            }
          }

          // Validate file size if specified
          if (field.maxFileSize && file.size > field.maxFileSize) {
            return NextResponse.json(
              { error: `File size exceeds limit for ${field.label}` },
              { status: 400 }
            );
          }

          try {
            // Convert file to buffer
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Upload to Cloudinary
            const uploadResult = await uploadImage(
              buffer,
              `form-submissions/${form.slug}`,
              `${field.id}-${Date.now()}.${file.name.split('.').pop()}`
            );

            fieldValues.push({
              submissionId: submission.id,
              fieldId: field.id,
              value: file.name, // Store filename as value
              fileUrl: uploadResult.secure_url,
              filePublicId: uploadResult.public_id,
            });
          } catch (uploadError) {
            console.error(`Error uploading file for ${field.label}:`, uploadError);
            return NextResponse.json(
              { error: `Failed to upload file for ${field.label}` },
              { status: 500 }
            );
          }
        } else {
          // Handle regular text fields
          fieldValues.push({
            submissionId: submission.id,
            fieldId: field.id,
            value: fieldValue.toString(),
          });
        }
      }
    }

    // Save all field values
    if (fieldValues.length > 0) {
      await prisma.formSubmissionValue.createMany({
        data: fieldValues
      });
    }

    // Record transaction if payment is required
    if (form.paymentRequired && form.paymentAmount) {
      try {
        await prisma.transaction.create({
          data: {
            type: 'OTHER_INCOME',
            amount: form.paymentAmount,
            description: `${form.title} - Form Submission Payment`,
            transactionDate: new Date(),
            paymentMethod: 'online_transfer',
            status: 'COMPLETED',
            isAutoGenerated: true,
            notes: `Auto-generated from form submission #${submission.id}`,
          },
        });
      } catch (transactionError) {
        console.error('Error creating transaction:', transactionError);
        // Don't fail the submission if transaction creation fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Form submitted successfully',
      submissionId: submission.id
    }, { status: 201 });

  } catch (error) {
    console.error('Error submitting form:', error);
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    );
  }
}
