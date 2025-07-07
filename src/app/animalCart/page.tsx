import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../api/auth/[...nextauth]/route'
import AnimalCartClient from '@/components/AnimalCartClient'

export default async function AnimalCartPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return <p className="text-center mt-10">Please login to view cart.</p>

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      animalCart: {
        include: {
          animal: {
            include: {
              images: true
            }
          }
        }
      }
    }
  })

  return <AnimalCartClient cartItems={user?.animalCart || []} />
}
