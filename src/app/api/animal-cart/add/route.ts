
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'


export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { animalId } = await req.json()

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    return new Response('User not found', { status: 404 })
  }

  // Check if already in cart
  const existingItem = await prisma.animalCart.findFirst({
    where: { userId: user.id, animalId }
  })

  if (existingItem) {
    // increase quantity
    await prisma.animalCart.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + 1 }
    })
  } else {
    await prisma.animalCart.create({
      data: {
        userId: user.id,
        animalId,
        quantity: 1
      }
    })
  }

  return new Response('Added to cart')
}
