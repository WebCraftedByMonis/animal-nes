"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { track } from "@/lib/trackingClient";

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  productId?: number;
}

export default function ShareButton({ title, text, url, productId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    track('SHARE', { productId, metadata: { channel: typeof navigator !== 'undefined' && navigator.share ? 'native' : 'clipboard' } });

    const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch {
        // user cancelled share sheet or it failed silently
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <button
      onClick={handleClick}
      className="
        absolute top-3 right-16 z-10
        p-2.5 rounded-full
        bg-white/90 dark:bg-zinc-900/90
        backdrop-blur-sm
        shadow-lg
        border border-zinc-200/50 dark:border-zinc-700/50
        transition-all duration-200
        hover:scale-110
        active:scale-95
      "
      aria-label="Share this product"
    >
      {copied ? (
        <Check className="h-5 w-5 stroke-green-500" />
      ) : (
        <Share2 className="h-5 w-5 stroke-zinc-700 dark:stroke-zinc-300 hover:stroke-green-500" />
      )}
    </button>
  );
}
