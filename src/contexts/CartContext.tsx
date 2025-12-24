"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";

interface CartItem {
  productId: number;
  variantId: number;
  quantity: number;
}

interface CartCounts {
  productCount: number;
  animalCount: number;
  totalCount: number;
}

interface CartContextType {
  counts: CartCounts;
  cartItems: CartItem[];
  addToCart: (productId: number, variantId: number) => Promise<void>;
  removeFromCart: (productId: number, variantId: number) => Promise<void>;
  updateQuantity: (productId: number, variantId: number, quantity: number) => Promise<void>;
  refreshCounts: () => Promise<void>;
  incrementProductCount: () => void;
  incrementAnimalCount: () => void;
  decrementProductCount: () => void;
  decrementAnimalCount: () => void;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [counts, setCounts] = useState<CartCounts>({
    productCount: 0,
    animalCount: 0,
    totalCount: 0,
  });
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get cart from localStorage (for guest users)
  const getLocalCart = (): CartItem[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error reading cart from localStorage:", error);
      return [];
    }
  };

  // Save cart to localStorage (for guest users)
  const saveLocalCart = (items: CartItem[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Error saving cart to localStorage:", error);
    }
  };

  // Sync localStorage cart to database when user logs in
  const syncCartToDatabase = async () => {
    const localCart = getLocalCart();
    if (localCart.length === 0) return;

    try {
      // Add each item from localStorage to database
      for (const item of localCart) {
        await fetch("/api/cart/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity
          }),
        });
      }
      // Clear localStorage after sync
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (error) {
      console.error("Error syncing cart to database:", error);
    }
  };

  const fetchCounts = async () => {
    if (!session?.user?.email) {
      // For guest users, count from localStorage
      const localCart = getLocalCart();
      const productCount = localCart.reduce((sum, item) => sum + item.quantity, 0);
      setCounts({
        productCount,
        animalCount: 0,
        totalCount: productCount
      });
      setCartItems(localCart);
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

  // Add to cart (works for both guest and logged-in users)
  const addToCart = async (productId: number, variantId: number) => {
    if (!session?.user?.email) {
      // Guest user - use localStorage
      const localCart = getLocalCart();
      const existingIndex = localCart.findIndex(
        item => item.productId === productId && item.variantId === variantId
      );

      let updatedCart: CartItem[];
      if (existingIndex >= 0) {
        updatedCart = [...localCart];
        updatedCart[existingIndex].quantity += 1;
      } else {
        updatedCart = [...localCart, { productId, variantId, quantity: 1 }];
      }

      saveLocalCart(updatedCart);
      setCartItems(updatedCart);
      const productCount = updatedCart.reduce((sum, item) => sum + item.quantity, 0);
      setCounts(prev => ({ ...prev, productCount, totalCount: productCount }));
      toast.success("Added to cart");
      return;
    }

    // Logged-in user - use API
    try {
      const response = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantId }),
      });

      if (response.ok) {
        incrementProductCount();
        toast.success("Added to cart");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to add to cart");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart");
    }
  };

  // Remove from cart
  const removeFromCart = async (productId: number, variantId: number) => {
    if (!session?.user?.email) {
      // Guest user - use localStorage
      const localCart = getLocalCart();
      const updatedCart = localCart.filter(
        item => !(item.productId === productId && item.variantId === variantId)
      );
      saveLocalCart(updatedCart);
      setCartItems(updatedCart);
      const productCount = updatedCart.reduce((sum, item) => sum + item.quantity, 0);
      setCounts(prev => ({ ...prev, productCount, totalCount: productCount }));
      toast.success("Removed from cart");
      return;
    }

    // Logged-in user - use API
    try {
      const response = await fetch("/api/cart/remove", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantId }),
      });

      if (response.ok) {
        await refreshCounts();
        toast.success("Removed from cart");
      }
    } catch (error) {
      console.error("Error removing from cart:", error);
      toast.error("Failed to remove from cart");
    }
  };

  // Update quantity
  const updateQuantity = async (productId: number, variantId: number, quantity: number) => {
    if (quantity < 1) {
      await removeFromCart(productId, variantId);
      return;
    }

    if (!session?.user?.email) {
      // Guest user - use localStorage
      const localCart = getLocalCart();
      const updatedCart = localCart.map(item =>
        item.productId === productId && item.variantId === variantId
          ? { ...item, quantity }
          : item
      );
      saveLocalCart(updatedCart);
      setCartItems(updatedCart);
      const productCount = updatedCart.reduce((sum, item) => sum + item.quantity, 0);
      setCounts(prev => ({ ...prev, productCount, totalCount: productCount }));
      return;
    }

    // Logged-in user - use API
    try {
      const response = await fetch("/api/cart/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantId, quantity }),
      });

      if (response.ok) {
        await refreshCounts();
      }
    } catch (error) {
      console.error("Error updating cart:", error);
      toast.error("Failed to update cart");
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

  // Sync localStorage to database when user logs in
  useEffect(() => {
    if (session?.user?.email && status === "authenticated") {
      syncCartToDatabase().then(() => {
        fetchCounts();
      });
    }
  }, [session?.user?.email, status]);

  // Refresh counts every 30 seconds (instead of 5 seconds for better performance)
  useEffect(() => {
    if (session?.user?.email) {
      const interval = setInterval(fetchCounts, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const value = {
    counts,
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
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