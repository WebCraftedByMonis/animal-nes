import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch form submissions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const approved = searchParams.get('approved');

    const where: any = {
      formId: params.id
    };

    if (approved === 'true') {
      where.approved = true;
    } else if (approved === 'false') {
      where.approved = false;
    }

    const submissions = await prisma.formSubmission.findMany({
      where,
      include: {
        form: {
          select: {
            title: true,
            slug: true,
          }
        },
        fieldValues: {
          include: {
            field: {
              select: {
                label: true,
                fieldType: true,
              }
            }
          },
          orderBy: {
            field: {
              orderIndex: 'asc'
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ submissions });

  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}

// PATCH - Approve/reject submission
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { submissionId, approved } = await request.json();

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      );
    }

    if (typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'Approved status is required' },
        { status: 400 }
      );
    }

    // Check if submission exists
    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId }
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Update submission
    const updatedSubmission = await prisma.formSubmission.update({
      where: { id: submissionId },
      data: { approved }
    });

    return NextResponse.json({
      success: true,
      message: `Submission ${approved ? 'approved' : 'rejected'} successfully`,
      submission: updatedSubmission
    });

  } catch (error) {
    console.error('Error updating submission:', error);
    return NextResponse.json(
      { error: 'Failed to update submission' },
      { status: 500 }
    );
  }
}

// DELETE - Delete submission
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const submissionId = searchParams.get('submissionId');

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      );
    }

    // Find submission with file references
    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: {
        fieldValues: true
      }
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Delete files from Cloudinary
    const { deleteFromCloudinary } = await import('@/lib/cloudinary');

    // Delete payment screenshot if exists
    if (submission.paymentScreenshotPublicId) {
      try {
        await deleteFromCloudinary(submission.paymentScreenshotPublicId, 'image');
      } catch (error) {
        console.error('Error deleting payment screenshot:', error);
      }
    }

    // Delete field files if exist
    for (const fieldValue of submission.fieldValues) {
      if (fieldValue.filePublicId) {
        try {
          await deleteFromCloudinary(fieldValue.filePublicId, 'image');
        } catch (error) {
          console.error('Error deleting field file:', error);
        }
      }
    }

    // Delete submission (cascade will delete field values)
    await prisma.formSubmission.delete({
      where: { id: submissionId }
    });

    return NextResponse.json({
      success: true,
      message: 'Submission deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting submission:', error);
    return NextResponse.json(
      { error: 'Failed to delete submission' },
      { status: 500 }
    );
  }
}
