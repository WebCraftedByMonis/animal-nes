import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Add Promise wrapper
) {
  // Await the params object first
  const { id: idString } = await params;
  const id = parseInt(idString);

  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const applicant = await prisma.jobApplicant.findUnique({
    where: { id },
    include: {
      image: true,
      cv: true,
    },
  });

  if (!applicant) {
    return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });
  }

  return NextResponse.json(applicant);
}