import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { validateCompanySession } from '@/lib/auth/company-auth';

// Helper to get company from session
async function getCompanyFromSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('company-token')?.value;

  if (!token) {
    return null;
  }

  try {
    const company = await validateCompanySession(token);
    return company?.id || null;
  } catch {
    return null;
  }
}

// PATCH - Update company price for a product variant
export async function PATCH(request: NextRequest) {
  try {
    const companyId = await getCompanyFromSession();

    if (!companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { variantId, companyPrice } = body;

    if (!variantId || companyPrice === undefined) {
      return NextResponse.json(
        { error: 'Variant ID and company price are required' },
        { status: 400 }
      );
    }

    // Verify this variant belongs to a product owned by this company
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            companyId: true
          }
        }
      }
    });

    if (!variant) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      );
    }

    if (variant.product?.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Unauthorized to update this variant' },
        { status: 403 }
      );
    }

    // Update the variant with the new company price
    const updatedVariant = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        companyPrice: parseFloat(companyPrice)
      }
    });

    return NextResponse.json({
      success: true,
      variant: updatedVariant
    });
  } catch (error) {
    console.error('Error updating company price:', error);
    return NextResponse.json(
      { error: 'Failed to update company price' },
      { status: 500 }
    );
  }
}
