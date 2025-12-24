"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useLoginModal } from "@/contexts/LoginModalContext";
import { ShoppingCart } from "lucide-react";

export default function CheckoutLoginPrompt() {
  const { status } = useSession();
  const { openModal } = useLoginModal();
  const [hasPromptedLogin, setHasPromptedLogin] = useState(false);

  // Show login modal when user is not authenticated
  useEffect(() => {
    if (status === "unauthenticated" && !hasPromptedLogin) {
      setHasPromptedLogin(true);
      openModal('button');
    }
  }, [status, openModal, hasPromptedLogin]);

  return (
    <div className="max-w-2xl mx-auto p-6 text-center space-y-6 mt-20">
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-8 border border-green-200 dark:border-green-800">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingCart className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Checkout
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Please sign in to complete your order and proceed to checkout.
        </p>
        <button
          onClick={() => openModal('button')}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
        >
          Sign In to Checkout
        </button>
      </div>
    </div>
  );
}
