import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const prescriptionId = parseInt(params.id);

    const prescription = await prisma.prescriptionForm.findUnique({
      where: { id: prescriptionId },
      include: {
        historyForm: {
          include: {
            appointment: {
              include: {
                customer: true
              }
            }
          }
        },
        prescriptionItems: true,
        additionalFees: true,
      },
    });

    if (!prescription) {
      return NextResponse.json(
        { error: 'Prescription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(prescription);

  } catch (error) {
    console.error('Error fetching prescription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}