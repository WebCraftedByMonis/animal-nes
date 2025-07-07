import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import SellFormClient from './SellFormClient'

export default async function SellPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return (
      <div className="text-center mt-20 text-lg font-medium text-gray-600">
        Please log in to submit an animal for sale.
      </div>
    )
  }

  return <SellFormClient />
}
