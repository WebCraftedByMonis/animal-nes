import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../api/auth/[...nextauth]/route'
import CartClient from './CartClient'

export default async function CartPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return <p className="text-center mt-10">Please login to view cart.</p>

  const user = await prisma.user.findUnique({
  where: { email: session.user.email },
  include: {
    cart: {
      include: {
        product: {
          include: {
            image: true,
            // Add this to fetch all variants for the product
          },
        },
        variant: true, // Add this to fetch the specific variant for this cart item
      },
    },
  },
})

  return <CartClient cartItems={user?.cart || []} />
}