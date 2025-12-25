"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";

interface QuickBuyNowButtonProps {
  productId: number;
  variantId?: number;
  className?: string;
}

export default function QuickBuyNowButton({ productId, variantId, className = "" }: QuickBuyNowButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { addToCart } = useCart();
  const router = useRouter();

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    e.preventDefault();

    if (!variantId) {
      toast.error("Please select a variant");
      return;
    }

    setIsProcessing(true);

    try {
      await addToCart(productId, variantId);
      router.push('/checkout');
    } catch (error) {
      console.error('Error during buy now:', error);
      setIsProcessing(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isProcessing}
      className={`
        p-2.5 rounded-full
        bg-green-600 hover:bg-green-700
        backdrop-blur-sm
        shadow-lg
        border border-green-500/50
        transition-all duration-200
        hover:scale-110
        active:scale-95
        disabled:opacity-50
        disabled:cursor-not-allowed
        ${className}
      `}
      aria-label="Buy now"
    >
      <Zap
        className={`
          h-5 w-5 transition-all duration-200
          ${isProcessing ? 'animate-pulse' : ''}
          stroke-white fill-white
        `}
      />
    </button>
  );
}
