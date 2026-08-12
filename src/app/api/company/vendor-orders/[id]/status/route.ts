import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { validateCompanySession } from '@/lib/auth/company-auth';

async function getCompanyFromSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('company-token')?.value;
  if (!token) return null;
  try {
    const company = await validateCompanySession(token);
    return company?.id || null;
  } catch {
    return null;
  }
}

const VALID_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

// PATCH - a company updates fulfillment status for its own slice of an
// order (its VendorOrder), independent of the overall Checkout.status
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const companyId = await getCompanyFromSession();
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const vendorOrderId = Number(id);
    if (!vendorOrderId || Number.isNaN(vendorOrderId)) {
      return NextResponse.json({ error: 'Invalid vendor order ID' }, { status: 400 });
    }

    const body = await request.json();
    const { status, trackingNumber, shippingCarrier, refundReason } = body;

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const vendorOrder = await prisma.vendorOrder.findUnique({ where: { id: vendorOrderId } });
    if (!vendorOrder) {
      return NextResponse.json({ error: 'Vendor order not found' }, { status: 404 });
    }
    if (vendorOrder.companyId !== companyId) {
      return NextResponse.json({ error: 'Unauthorized to update this vendor order' }, { status: 403 });
    }

    const updated = await prisma.vendorOrder.update({
      where: { id: vendorOrderId },
      data: {
        ...(status ? { status } : {}),
        ...(trackingNumber !== undefined ? { trackingNumber } : {}),
        ...(shippingCarrier !== undefined ? { shippingCarrier } : {}),
        ...(refundReason !== undefined ? { refundReason } : {}),
      },
    });

    return NextResponse.json({ success: true, vendorOrder: updated });
  } catch (error) {
    console.error('Error updating vendor order status:', error);
    return NextResponse.json({ error: 'Failed to update vendor order status' }, { status: 500 });
  }
}
