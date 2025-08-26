import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AnimalCartClient from '@/components/AnimalCartClient'

export default async function AnimalCartPage() {
  const session = await auth()
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
