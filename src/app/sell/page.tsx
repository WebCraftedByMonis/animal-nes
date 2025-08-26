import { auth } from '@/lib/auth'
import SellFormClient from './SellFormClient'

export default async function SellPage() {
  const session = await auth()

  if (!session?.user?.email) {
    return (
      <div className="text-center mt-20 text-lg font-medium text-gray-600">
        Please log in to submit an animal for sale.
      </div>
    )
  }

  return <SellFormClient />
}
