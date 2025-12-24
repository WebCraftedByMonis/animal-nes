"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useWishlist } from "@/contexts/WishlistContext";
import { useSession } from "next-auth/react";
import { useLoginModal } from "@/contexts/LoginModalContext";

interface WishlistButtonProps {
  productId: number;
}

export default function WishlistButton({ productId }: WishlistButtonProps) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { data: session, status } = useSession();
  const { openModal } = useLoginModal();
  const [isAnimating, setIsAnimating] = useState(false);
  const inWishlist = isInWishlist(productId);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    if (inWishlist) {
      await removeFromWishlist(productId);
    } else {
      await addToWishlist(productId);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        absolute top-3 right-3 z-10
        p-2.5 rounded-full
        bg-white/90 dark:bg-zinc-900/90
        backdrop-blur-sm
        shadow-lg
        border border-zinc-200/50 dark:border-zinc-700/50
        transition-all duration-200
        hover:scale-110
        active:scale-95
        ${isAnimating ? 'scale-125' : ''}
      `}
      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart
        className={`
          h-5 w-5 transition-all duration-200
          ${inWishlist
            ? 'fill-red-500 stroke-red-500'
            : 'stroke-zinc-700 dark:stroke-zinc-300 hover:stroke-red-500'
          }
        `}
      />
    </button>
  );
}
