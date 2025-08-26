import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function OrdersPage() {
  const session = await auth()
  if (!session?.user?.email) {
    return <p className="text-center mt-10">Please log in to view your orders.</p>
  }

  const orders = await prisma.checkout.findMany({
    where: { user: { email: session.user.email } },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
          animal: {
            include: {
              images: true
            }
          }
        }
      }
    },
  })

  if (!orders.length) {
    return <p className="text-center mt-10 text-gray-700">No orders found.</p>
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-green-500 mb-6">Your Orders</h1>
      <ul className="space-y-4">
        {orders.map(order => (
          <li key={order.id} className="border p-4 rounded-lg shadow">
            <p className="font-semibold">Order ID: {order.id}</p>
            <div className="mb-2">
              <p className="font-semibold">Items:</p>
              <ul className="list-disc list-inside ml-4">
                {order.items.map(item => (
                  <li key={item.id}>
                    {item.product
                      ? `${item.product.productName} ${item.variant?.packingVolume ? `(${item.variant.packingVolume})` : ''} - Qty: ${item.quantity}`
                      : item.animal
                        ? `${item.animal.specie} - ${item.animal.breed} (Animal) - Qty: ${item.quantity}`
                        : "Unknown Item"
                    }
                  </li>
                ))}
              </ul>
            </div>

            <p>Status: <span className="text-green-600">{order.status}</span></p>
            <p>Total: PKR {order.total.toFixed(2)}</p>
            <p>Payment: {order.paymentMethod}</p>
            <p>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
