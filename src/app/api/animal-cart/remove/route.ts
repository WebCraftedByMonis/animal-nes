// /app/api/animal-cart/remove/route.ts

import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id } = await req.json()

  if (!id) {
    return new Response('Invalid data', { status: 400 })
  }

  try {
    await prisma.animalCart.delete({
      where: { id }
    })

    return new Response('Item removed', { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response('Server error', { status: 500 })
  }
}
