"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";

interface WishlistItem {
  id: number;
  productId: number;
  product?: {
    id: number;
    productName: string;
    image?: {
      url: string;
      alt: string;
    };
    company?: {
      companyName: string;
    };
    variants?: Array<{
      packingVolume: string;
      customerPrice: number;
    }>;
  };
}

interface WishlistContextType {
  wishlist: WishlistItem[];
  wishlistProductIds: Set<number>;
  addToWishlist: (productId: number) => Promise<void>;
  removeFromWishlist: (productId: number) => Promise<void>;
  isInWishlist: (productId: number) => boolean;
  refreshWishlist: () => Promise<void>;
  isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_STORAGE_KEY = "wishlist";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [wishlistProductIds, setWishlistProductIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Get wishlist from localStorage (for guest users)
  const getLocalWishlist = (): number[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error reading wishlist from localStorage:", error);
      return [];
    }
  };

  // Save wishlist to localStorage (for guest users)
  const saveLocalWishlist = (productIds: number[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(productIds));
    } catch (error) {
      console.error("Error saving wishlist to localStorage:", error);
    }
  };

  // Sync localStorage wishlist to database when user logs in
  const syncWishlistToDatabase = async () => {
    const localWishlist = getLocalWishlist();
    if (localWishlist.length === 0) return;

    try {
      // Add each item from localStorage to database
      for (const productId of localWishlist) {
        await fetch("/api/wishlist/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
      }
      // Clear localStorage after sync
      localStorage.removeItem(WISHLIST_STORAGE_KEY);
    } catch (error) {
      console.error("Error syncing wishlist to database:", error);
    }
  };

  // Fetch wishlist from database (for logged-in users)
  const fetchWishlist = async () => {
    if (!session?.user?.email) {
      // For guest users, load from localStorage
      const localWishlist = getLocalWishlist();
      setWishlistProductIds(new Set(localWishlist));
      setWishlist([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/wishlist");
      if (response.ok) {
        const data = await response.json();
        setWishlist(data.wishlist || []);
        const productIds = new Set(
          (data.wishlist || []).map((item: WishlistItem) => item.productId)
        );
        setWishlistProductIds(productIds);
      }
    } catch (error) {
      console.error("Failed to fetch wishlist:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add to wishlist (works for both guest and logged-in users)
  const addToWishlist = async (productId: number) => {
    if (!session?.user?.email) {
      // Guest user - use localStorage
      const localWishlist = getLocalWishlist();
      if (!localWishlist.includes(productId)) {
        const updated = [...localWishlist, productId];
        saveLocalWishlist(updated);
        setWishlistProductIds(new Set(updated));
        toast.success("Added to wishlist");
      }
      return;
    }

    // Logged-in user - use API
    try {
      const response = await fetch("/api/wishlist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (response.ok) {
        setWishlistProductIds(prev => new Set([...prev, productId]));
        await refreshWishlist();
        toast.success("Added to wishlist");
      }
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      toast.error("Failed to add to wishlist");
    }
  };

  // Remove from wishlist (works for both guest and logged-in users)
  const removeFromWishlist = async (productId: number) => {
    if (!session?.user?.email) {
      // Guest user - use localStorage
      const localWishlist = getLocalWishlist();
      const updated = localWishlist.filter(id => id !== productId);
      saveLocalWishlist(updated);
      setWishlistProductIds(new Set(updated));
      toast.success("Removed from wishlist");
      return;
    }

    // Logged-in user - use API
    try {
      const response = await fetch("/api/wishlist/remove", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (response.ok) {
        setWishlistProductIds(prev => {
          const updated = new Set(prev);
          updated.delete(productId);
          return updated;
        });
        await refreshWishlist();
        toast.success("Removed from wishlist");
      }
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast.error("Failed to remove from wishlist");
    }
  };

  // Check if product is in wishlist
  const isInWishlist = (productId: number): boolean => {
    return wishlistProductIds.has(productId);
  };

  // Refresh wishlist
  const refreshWishlist = async () => {
    setIsLoading(true);
    await fetchWishlist();
  };

  // Fetch wishlist when session changes
  useEffect(() => {
    if (status !== "loading") {
      fetchWishlist();
    }
  }, [session, status]);

  // Sync localStorage to database when user logs in
  useEffect(() => {
    if (session?.user?.email && status === "authenticated") {
      syncWishlistToDatabase().then(() => {
        fetchWishlist();
      });
    }
  }, [session?.user?.email, status]);

  const value = {
    wishlist,
    wishlistProductIds,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    refreshWishlist,
    isLoading,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
