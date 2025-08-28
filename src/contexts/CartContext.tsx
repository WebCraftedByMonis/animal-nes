"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface CartCounts {
  productCount: number;
  animalCount: number;
  totalCount: number;
}

interface CartContextType {
  counts: CartCounts;
  refreshCounts: () => Promise<void>;
  incrementProductCount: () => void;
  incrementAnimalCount: () => void;
  decrementProductCount: () => void;
  decrementAnimalCount: () => void;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [counts, setCounts] = useState<CartCounts>({
    productCount: 0,
    animalCount: 0,
    totalCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchCounts = async () => {
    if (!session?.user?.email) {
      setCounts({ productCount: 0, animalCount: 0, totalCount: 0 });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/cart-count");
      if (response.ok) {
        const data = await response.json();
        setCounts({
          productCount: data.productCount || 0,
          animalCount: data.animalCount || 0,
          totalCount: data.totalCount || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch cart counts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCounts = async () => {
    setIsLoading(true);
    await fetchCounts();
  };

  const incrementProductCount = () => {
    setCounts(prev => ({
      ...prev,
      productCount: prev.productCount + 1,
      totalCount: prev.totalCount + 1,
    }));
  };

  const incrementAnimalCount = () => {
    setCounts(prev => ({
      ...prev,
      animalCount: prev.animalCount + 1,
      totalCount: prev.totalCount + 1,
    }));
  };

  const decrementProductCount = () => {
    setCounts(prev => ({
      ...prev,
      productCount: Math.max(0, prev.productCount - 1),
      totalCount: Math.max(0, prev.totalCount - 1),
    }));
  };

  const decrementAnimalCount = () => {
    setCounts(prev => ({
      ...prev,
      animalCount: Math.max(0, prev.animalCount - 1),
      totalCount: Math.max(0, prev.totalCount - 1),
    }));
  };

  // Fetch counts when session changes
  useEffect(() => {
    if (status !== "loading") {
      fetchCounts();
    }
  }, [session, status]);

  // Refresh counts every 30 seconds (instead of 5 seconds for better performance)
  useEffect(() => {
    if (session?.user?.email) {
      const interval = setInterval(fetchCounts, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const value = {
    counts,
    refreshCounts,
    incrementProductCount,
    incrementAnimalCount,
    decrementProductCount,
    decrementAnimalCount,
    isLoading,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}