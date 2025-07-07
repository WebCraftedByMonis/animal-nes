import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const deliveryChargeSchema = z.object({
  cityId: z.number().int(),
  amount: z.number().min(0),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const sortBy = searchParams.get("sortBy") || "id"
  const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc"
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = parseInt(searchParams.get("limit") || "10", 10)
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    prisma.deliveryCharge.findMany({
      where: {
        city: {
          name: { contains: search },
        },
      },
      include: { city: true },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    }),
    prisma.deliveryCharge.count({
      where: {
        city: {
          name: { contains: search },
        },
      },
    }),
  ])

  return NextResponse.json({
    data: items,
    total,
    page,
    lastSubmittedAt: items.length > 0 ? items[items.length - 1].createdAt ?? null : null,
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = deliveryChargeSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const newCharge = await prisma.deliveryCharge.create({
      data: result.data,
    })

    return NextResponse.json(newCharge, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create delivery charge" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { id, cityId, amount } = await req.json()
    if (!id || !cityId || amount == null) {
      return NextResponse.json({ error: "ID, cityId, and amount are required" }, { status: 400 })
    }

    const updated = await prisma.deliveryCharge.update({
      where: { id },
      data: { cityId, amount },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to update delivery charge" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = parseInt(req.nextUrl.searchParams.get("id") || "", 10)
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    await prisma.deliveryCharge.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete delivery charge" }, { status: 500 })
  }
}
