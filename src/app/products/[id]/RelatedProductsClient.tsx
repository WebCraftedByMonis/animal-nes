"use client"

import Link from "next/link"
import { useCountry } from "@/contexts/CountryContext"

interface RelatedProduct {
  id: number
  productName: string
  image?: { url: string; alt?: string } | null
  variants?: { customerPrice: number }[]
}

export default function RelatedProductsClient({ products }: { products: RelatedProduct[] }) {
  const { currencySymbol } = useCountry()

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {products.map((p) => (
        <Link
          key={p.id}
          href={`/products/${p.id}`}
          className="group bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-3 hover:shadow-md transition-shadow"
        >
          {p.image?.url && (
            <div className="aspect-square mb-2 overflow-hidden rounded">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image.url.replace(/^http:\/\//, 'https://')}
                alt={p.image.alt || p.productName}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
            </div>
          )}
          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
            {p.productName}
          </p>
          {p.variants?.[0]?.customerPrice != null && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-1 font-medium">
              {currencySymbol} {p.variants[0].customerPrice.toLocaleString()}
            </p>
          )}
        </Link>
      ))}
    </div>
  )
}
