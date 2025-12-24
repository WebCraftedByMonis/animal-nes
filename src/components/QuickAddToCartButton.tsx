"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { toast } from "react-hot-toast";
import { useCart } from "@/contexts/CartContext";

interface QuickAddToCartButtonProps {
  productId: number;
  variantId?: number;
  className?: string;
}

export default function QuickAddToCartButton({ productId, variantId, className = "" }: QuickAddToCartButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { addToCart } = useCart();

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    e.preventDefault();

    if (!variantId) {
      toast.error("Please select a variant");
      return;
    }

    setIsAdding(true);

    try {
      await addToCart(productId, variantId);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isAdding}
      className={`
        p-2.5 rounded-full
        bg-white/90 dark:bg-zinc-900/90
        backdrop-blur-sm
        shadow-lg
        border border-zinc-200/50 dark:border-zinc-700/50
        transition-all duration-200
        hover:scale-110
        active:scale-95
        disabled:opacity-50
        disabled:cursor-not-allowed
        ${className}
      `}
      aria-label="Add to cart"
    >
      <ShoppingCart
        className={`
          h-5 w-5 transition-all duration-200
          ${isAdding ? 'animate-pulse' : ''}
          stroke-green-600 hover:stroke-green-700
        `}
      />
    </button>
  );
}
