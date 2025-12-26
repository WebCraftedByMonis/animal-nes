import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE - Delete single email log
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const emailLogId = parseInt(id);

    if (isNaN(emailLogId)) {
      return NextResponse.json(
        { error: 'Invalid email log ID' },
        { status: 400 }
      );
    }

    // Check if email log exists
    const emailLog = await prisma.emailLog.findUnique({
      where: { id: emailLogId }
    });

    if (!emailLog) {
      return NextResponse.json(
        { error: 'Email log not found' },
        { status: 404 }
      );
    }

    // Delete the email log
    await prisma.emailLog.delete({
      where: { id: emailLogId }
    });

    return NextResponse.json({
      success: true,
      message: 'Email log deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting email log:', error);
    return NextResponse.json(
      { error: 'Failed to delete email log' },
      { status: 500 }
    );
  }
}
