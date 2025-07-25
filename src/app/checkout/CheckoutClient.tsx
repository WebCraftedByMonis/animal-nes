'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CartItem } from '../../../types/cart'// 
import { AnimalCartItem } from '../../../types/animal'

interface CheckoutProps {
    cartItems: CartItem[]
    animalCartItems: AnimalCartItem[]
}

export default function CheckoutClient({ cartItems, animalCartItems }: CheckoutProps) {
    const { data: session } = useSession()
    const router = useRouter()

    const [city, setCity] = useState('')
    const [province, setProvince] = useState('')
    const [address, setAddress] = useState('')
    const [shippingAddress, setShippingAddress] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('')
    const [termsAccepted, setTermsAccepted] = useState(false)
    const [showFullTerms, setShowFullTerms] = useState(false)
    const [loading, setLoading] = useState(false)

    const total =
        cartItems.reduce((sum, item) => sum + item.quantity * item.variant.customerPrice, 0) +
        animalCartItems.reduce((sum, item) => sum + item.quantity * item.animal.totalPrice, 0)

    const handleSubmit = async () => {
        if (!termsAccepted || !paymentMethod) return alert('Please accept terms and select payment method.')
        setLoading(true)

        const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                city,
                province,
                address,
                shippingAddress,
                paymentMethod,
                cart: cartItems,
                animalCart: animalCartItems,
                total,
            }),
        })

        setLoading(false)

        if (res.ok) router.push('/thankyou')
        else alert('Checkout failed. Please try again.')
    }

    return (
        <div className="max-w-4xl dark:bg-gray-900 mx-auto p-6">
            <h1 className="text-3xl font-bold text-green-500 mb-6">Checkout Form</h1>

            <form className="space-y-4">
                <input type="text" value={session?.user?.name || ''} disabled className="w-full border p-2 rounded" />
                <input type="email" value={session?.user?.email || ''} disabled className="w-full border p-2 rounded" />

                <input type="text" placeholder="City" value={city} onChange={e => setCity(e.target.value)} className="w-full border p-2 rounded" />
                <input type="text" placeholder="Province" value={province} onChange={e => setProvince(e.target.value)} className="w-full border p-2 rounded" />
                <input type="text" placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} className="w-full border p-2 rounded" />
                <input type="text" placeholder="Shipping Address" value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} className="w-full border p-2 rounded" />

                <div className="mt-6">
                    <h2 className="text-xl font-semibold mb-2">Cart Summary</h2>
                    <table className="w-full border text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Product/Animal</th>
                                <th className="p-2 text-left">Description</th>
                                <th className="p-2 text-right">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cartItems.map(item => (
                                <tr key={`product-${item.id}`} className="border-b">
                                    <td className="p-2">{item.product.productName}</td>
                                    <td className="p-2">Qty: {item.quantity} - {item.variant.packingVolume}</td>
                                    <td className="p-2 text-right">PKR {(item.variant.customerPrice * item.quantity).toFixed(2)}</td>
                                </tr>
                            ))}
                            {animalCartItems.map(item => (
                                <tr key={`animal-${item.id}`} className="border-b">
                                    <td className="p-2">{item.animal.specie} - {item.animal.breed}</td>
                                    <td className="p-2">Qty: {item.quantity}</td>
                                    <td className="p-2 text-right">PKR {(item.animal.totalPrice * item.quantity).toFixed(2)}</td>
                                </tr>
                            ))}
                            <tr>
                                <td colSpan={2} className="text-right font-bold p-2">Total:</td>
                                <td className="text-right font-bold p-2 text-green-500">PKR {total.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="mt-4">
                    <h3 className="font-semibold mb-2">Select Payment Method</h3>
                    <div className="flex flex-col gap-2">
                        {['Jazz cash 0300-8424741 Muhammad Fiaz Qamar', 'Easypaisa 03354145431 Ghazala Yasmeen', 'Bank Transfer: Account Title ZAIDIS INTERNATIONAL Account Number  01531002450497 IBAN PK82ALFH0153001002450497 Swift code ALFHPKKAXXX Branch Name Chauburji Branch, Lahore  Branch Code 0153 Bank Name Bank Alfalah'].map(method => (
                            <label key={method} className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    name="payment"
                                    value={method}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                />
                                {method}
                            </label>
                        ))}
                    </div>
                </div>

                <h1 className='text-3xl font-semibold text-green-500'>Privacy</h1>

                <div className="mt-4">
                    <label className="flex items-start gap-2">
                        <div>
                            <p className="text-sm text-gray-700">
                                Note: Please note that some products are not eligible for a return if the product is "No longer needed."
                                {showFullTerms ? (
                                    <>
                                        {' '}
                                        All customers are hereby notified that as per the terms and conditions of COD, the courier company/Delivery Personnel will not allow the customer to open the package before payment. Customers are subjected to pay for delivery charges when used other delivery services like bus services and courier services or builty services. Prices are subject to change anytime without further notice and animal nexus can cancel any order prior any notice. We reserve the right to change our product's prices at any time without further notice as complied by our suppliers and manufactures. Vaccination will be delivered in cold storage and will have extra charges. Delivery times will be agreed with you at the time of placing your order. Product packaging of actual product delivered may differ based on region and recent stock. You can cancel or change any of your current orders by contacting us on our support number before the dispatch of the order.
                                    </>
                                ) : (
                                    <> <button type="button" onClick={() => setShowFullTerms(true)} className="text-green-500 underline ml-1 text-sm">Read more</button></>
                                )}
                            </p>
                        </div>
                    </label>
                </div>

                <div className="mt-4">
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} />
                        I agree to the Privacy Policy and Terms & Conditions
                    </label>
                </div>

                <Button type="button" className="bg-green-500 text-white mt-4" disabled={loading} onClick={handleSubmit}>
                    {loading ? 'Placing Order...' : 'Place Order'}
                </Button>

            </form>
        </div>
    )
}
