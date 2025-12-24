// app/checkout/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import CheckoutClient from './CheckoutClient'
import CheckoutLoginPrompt from './CheckoutLoginPrompt'

export default async function CheckoutPage() {
  const session = await auth()
  if (!session?.user?.email) {
    return <CheckoutLoginPrompt />
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      cart: {
        include: {
          product: {
            include: { image: true },
          },
          variant: true, // Add this line to include variant info
        },
      },
      animalCart: { include: { animal: { include: { images: true } } } },
    },
  })

  return <CheckoutClient cartItems={user?.cart || []} animalCartItems={user?.animalCart || []} />
}
