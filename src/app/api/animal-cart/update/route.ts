// /app/api/animal-cart/update/route.ts

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()

  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id, quantity } = await req.json()

  if (!id || quantity < 1) {
    return new Response('Invalid data', { status: 400 })
  }

  try {
    // update the animalCartItem
    await prisma.animalCart.update({
      where: { id },
      data: { quantity }
    })

    return new Response('Quantity updated', { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response('Server error', { status: 500 })
  }
}
