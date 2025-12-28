import { NextRequest, NextResponse } from 'next/server';
import { validatePartnerSession } from '@/lib/auth/partner-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Authenticate partner
    const token = request.cookies.get('partner-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const partner = await validatePartnerSession(token);

    if (!partner) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get pagination params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';

    // Fetch all orders that contain this partner's products
    const where: any = {
      items: {
        some: {
          product: {
            partnerId: partner.id
          }
        }
      }
    };

    // Add search filter if provided
    if (search) {
      where.OR = [
        { id: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { status: { contains: search } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.checkout.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          items: {
            where: {
              product: {
                partnerId: partner.id
              }
            },
            include: {
              product: {
                include: {
                  company: true,
                }
              },
              variant: true,
            }
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.checkout.count({ where }),
    ]);

    // Transform the data to include profit calculations
    const partnerOrders = orders.map(order => ({
      orderId: order.id,
      orderDate: order.createdAt,
      customerName: order.user?.name || 'N/A',
      customerEmail: order.user?.email || 'N/A',
      status: order.status,
      city: order.city,
      province: order.province,
      address: order.address,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      items: order.items.map(item => {
        const sellingPrice = item.price;
        const purchasedPrice = item.purchasedPrice || 0;
        const totalProfit = (sellingPrice - purchasedPrice) * item.quantity;
        const partnerShare = totalProfit * 0.5; // 50% split
        const websiteShare = totalProfit * 0.5;

        return {
          itemId: item.id,
          productName: item.product?.productName || 'N/A',
          companyName: item.product?.company?.companyName || 'N/A',
          variant: item.variant?.packingVolume || 'N/A',
          quantity: item.quantity,
          sellingPrice: sellingPrice,
          purchasedPrice: purchasedPrice,
          totalProfit: totalProfit,
          partnerShare: partnerShare,
          websiteShare: websiteShare,
        };
      }),
    }));

    return NextResponse.json({
      orders: partnerOrders,
      total,
    });

  } catch (error) {
    console.error('Error fetching partner orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
