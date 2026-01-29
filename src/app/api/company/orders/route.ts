import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { validateCompanySession } from '@/lib/auth/company-auth';
import { updateTransactionProfit } from '@/lib/autoTransaction';

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

// GET - Fetch orders containing products from the logged-in company
export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyFromSession();

    if (!companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build where clause - only items from this company's products
    const whereClause: any = {
      product: {
        companyId: companyId
      }
    };

    if (search) {
      whereClause.OR = [
        { product: { productName: { contains: search } } },
        { checkout: { user: { name: { contains: search } } } },
        { checkout: { city: { contains: search } } }
      ];
      whereClause.product = { companyId: companyId };
    }

    // Fetch checkout items with related data
    const items = await prisma.checkoutItem.findMany({
      where: whereClause,
      include: {
        checkout: {
          select: {
            id: true,
            createdAt: true,
            status: true,
            city: true,
            province: true,
            address: true,
            shippingAddress: true,
            paymentMethod: true,
            total: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        product: {
          include: {
            partner: {
              select: {
                id: true,
                partnerName: true,
                shopName: true
              }
            }
          }
        },
        variant: {
          select: {
            id: true,
            packingVolume: true,
            customerPrice: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: {
        checkout: {
          createdAt: 'desc'
        }
      }
    });

    // Count total items for pagination
    const total = await prisma.checkoutItem.count({
      where: whereClause
    });

    // Transform data for frontend
    const orders = items.map(item => ({
      orderId: item.checkout.id,
      itemId: item.id,
      orderDate: item.checkout.createdAt,
      customerName: item.checkout.user?.name || 'N/A',
      customerEmail: item.checkout.user?.email || 'N/A',
      city: item.checkout.city,
      province: item.checkout.province,
      address: item.checkout.address,
      mobileNumber: item.checkout.shippingAddress,
      productName: item.product?.productName || 'N/A',
      partnerName: item.product?.partner?.partnerName || 'N/A',
      variant: item.variant?.packingVolume || 'N/A',
      quantity: item.quantity,
      sellingPrice: item.price,
      purchasedPrice: item.purchasedPrice,
      status: item.checkout.status,
      paymentMethod: item.checkout.paymentMethod
    }));

    return NextResponse.json({
      orders,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Error fetching company orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// PATCH - Update purchased price for a checkout item
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
    const { itemId, purchasedPrice } = body;

    if (!itemId || purchasedPrice === undefined) {
      return NextResponse.json(
        { error: 'Item ID and purchased price are required' },
        { status: 400 }
      );
    }

    // Verify this item belongs to the company's product
    const currentItem = await prisma.checkoutItem.findUnique({
      where: { id: itemId },
      include: {
        product: {
          select: {
            companyId: true
          }
        }
      }
    });

    if (!currentItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    if (currentItem.product?.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Unauthorized to update this item' },
        { status: 403 }
      );
    }

    // Update the checkout item with the new purchased price
    const updatedItem = await prisma.checkoutItem.update({
      where: { id: itemId },
      data: {
        purchasedPrice: parseFloat(purchasedPrice)
      }
    });

    // Recalculate and update profit in finance transactions
    const totalSellingPrice = currentItem.price * currentItem.quantity;
    const totalPurchasedPrice = parseFloat(purchasedPrice) * currentItem.quantity;

    await updateTransactionProfit(itemId, totalSellingPrice, totalPurchasedPrice);

    console.log(`[Company Order] Updated item #${itemId}: Selling: ${totalSellingPrice}, Cost: ${totalPurchasedPrice}, Profit: ${totalSellingPrice - totalPurchasedPrice}`);

    return NextResponse.json({
      success: true,
      item: updatedItem,
      profit: totalSellingPrice - totalPurchasedPrice
    });
  } catch (error) {
    console.error('Error updating purchased price:', error);
    return NextResponse.json(
      { error: 'Failed to update purchased price' },
      { status: 500 }
    );
  }
}
