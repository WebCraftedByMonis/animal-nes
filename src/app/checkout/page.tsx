// app/checkout/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import CheckoutClient from './CheckoutClient'

export default async function CheckoutPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return <p className="text-center mt-10">Please login to proceed with checkout.</p>
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
