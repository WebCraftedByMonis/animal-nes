import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailType, EmailStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = 20;
    const emailType = searchParams.get('emailType') || 'ALL';
    const status = searchParams.get('status') || 'ALL';
    const search = searchParams.get('search') || '';

    // Build where clause
    const where: any = {};

    if (emailType !== 'ALL') {
      where.emailType = emailType as EmailType;
    }

    if (status !== 'ALL') {
      where.status = status as EmailStatus;
    }

    if (search) {
      where.OR = [
        { recipientEmail: { contains: search } },
        { recipientName: { contains: search } },
        { subject: { contains: search } },
      ];
    }

    // Get total count
    const total = await prisma.emailLog.count({ where });

    // Get paginated logs
    const logs = await prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Error fetching email logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email logs' },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete email logs
export async function DELETE(request: NextRequest) {
  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'No email log IDs provided' },
        { status: 400 }
      );
    }

    // Delete the email logs
    const result = await prisma.emailLog.deleteMany({
      where: {
        id: { in: ids }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.count} email log(s)`,
      deletedCount: result.count
    });
  } catch (error) {
    console.error('Error deleting email logs:', error);
    return NextResponse.json(
      { error: 'Failed to delete email logs' },
      { status: 500 }
    );
  }
}
