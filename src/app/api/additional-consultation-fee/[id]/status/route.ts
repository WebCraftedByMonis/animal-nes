import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await request.json();
    const feeId = parseInt(params.id);

    if (!status || !['PENDING', 'PAID', 'CANCELLED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const updatedFee = await prisma.additionalConsultationFee.update({
      where: { id: feeId },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      data: updatedFee,
    });

  } catch (error) {
    console.error('Error updating additional consultation fee status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}