"use client";

import { useEffect, useState } from "react";
import { useWishlist } from "@/contexts/WishlistContext";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLoginModal } from "@/contexts/LoginModalContext";
import Image from "next/image";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function WishlistClient() {
  const { wishlist, wishlistProductIds, removeFromWishlist, isLoading } = useWishlist();
  const { data: session, status } = useSession();
  const { openModal } = useLoginModal();
  const router = useRouter();

  if (status === 'loading' || isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Wishlist</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <WishlistCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Guest user with items in localStorage
  if (!session?.user?.email && wishlistProductIds.size > 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Wishlist
          </h1>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {wishlistProductIds.size} {wishlistProductIds.size === 1 ? "item" : "items"}
          </Badge>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            You have {wishlistProductIds.size} item{wishlistProductIds.size === 1 ? '' : 's'} in your wishlist.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Sign in to see product details and sync your wishlist across devices.
          </p>
          <button
            onClick={() => openModal('button')}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Sign In to View Details
          </button>
        </div>

        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Your wishlist is saved locally. Sign in to access it from any device.
        </p>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Heart className="h-24 w-24 text-gray-300 dark:text-gray-700 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Your wishlist is empty
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Start adding products you love to your wishlist
        </p>
        <button
          onClick={() => router.push("/products")}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
        >
          Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          My Wishlist
        </h1>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {wishlist.length} {wishlist.length === 1 ? "item" : "items"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {wishlist.map((item) => {
          const product = item.product;
          if (!product) return null;

          const variant = product.variants?.[0];

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-zinc-900 rounded-lg shadow-md overflow-hidden border border-zinc-200 dark:border-zinc-800 transition-all hover:shadow-lg"
            >
              {/* Product Image */}
              <div className="relative aspect-square w-full cursor-pointer" onClick={() => router.push(`/products/${product.id}`)}>
                {product.image ? (
                  <Image
                    src={product.image.url}
                    alt={product.image.alt || product.productName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                    <span className="text-gray-400">No Image</span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4 space-y-3">
                <h3
                  className="font-bold text-lg line-clamp-2 cursor-pointer hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  onClick={() => router.push(`/products/${product.id}`)}
                >
                  {product.productName}
                </h3>

                {variant && variant.customerPrice && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-700 border-green-600/40">
                      PKR {variant.customerPrice.toLocaleString()}
                    </Badge>
                    {variant.packingVolume && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {variant.packingVolume}
                      </span>
                    )}
                  </div>
                )}

                {product.company && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    By: {product.company.companyName}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-green-600/40 text-green-700 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                    onClick={() => router.push(`/products/${product.id}`)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFromWishlist(product.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WishlistCardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md overflow-hidden border border-zinc-200 dark:border-zinc-800">
      <Skeleton className="aspect-square w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
    </div>
  );
}
