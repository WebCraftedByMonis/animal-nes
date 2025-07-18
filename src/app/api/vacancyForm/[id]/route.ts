import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const numericId = Number(params.id);

  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
  }

  try {
    const jobForm = await prisma.jobForm.findUnique({
      where: { id: numericId },
      include: {
        jobFormImage: true,
      },
    });

    if (!jobForm) {
      return NextResponse.json({ error: 'Job form not found' }, { status: 404 });
    }

    return NextResponse.json(jobForm);
  } catch (error) {
    console.error('Error fetching job form by ID:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job form' },
      { status: 500 }
    );
  }
}
