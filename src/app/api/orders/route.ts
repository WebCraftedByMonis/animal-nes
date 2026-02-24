import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '10')
  const page = parseInt(searchParams.get('page') || '1')
  const search = searchParams.get('search') || ''
  const country = searchParams.get('country') || ''
  const status = searchParams.get('status') || ''

  const where: any = search
    ? {
        OR: [
          { user: { name: { contains: search,  } } },
          { user: { email: { contains: search, } } },
          { city: { contains: search, } },
          { province: { contains: search, } },
          { address: { contains: search, } },
          { shippingAddress: { contains: search, } },
        ],
      }
    : {}

  const itemFilter: any = {}

  if (country && country !== 'all') {
    itemFilter.OR = [
      {
        product: {
          company: {
            country,
          },
        },
      },
      {
        animal: {
          country,
        },
      },
    ]
  }

  if (Object.keys(itemFilter).length > 0) {
    where.items = {
      some: itemFilter,
    }
  }

  if (status) {
    where.status = status
  }

    const [orders, total] = await Promise.all([
      prisma.checkout.findMany({
        where,
        include: {
          user: true,
          items: {
            ...(Object.keys(itemFilter).length > 0 ? { where: itemFilter } : {}),
            include: {
              product: true,
              variant: true,
              animal: true,
            }
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.checkout.count({ where }),
    ]);
    
    console.log(JSON.stringify(orders, null, 2));
    


  return NextResponse.json({ orders,total })
}
