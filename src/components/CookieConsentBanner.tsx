'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getClientConsent, setClientConsent } from '@/lib/consent';

// Bottom-of-screen cookie consent bar. Accept turns on the personalized
// "Recommended For You" rails on the homepage and /products (see
// consent.ts for exactly what it gates); Decline keeps the site fully
// usable, just without those personalized picks — no feature is blocked
// either way, so this never needs to be modal/blocking.
export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getClientConsent() !== null) return;
    // Skip for bots (Googlebot uses headless Chrome which sets navigator.webdriver)
    if (navigator.webdriver) return;
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const choose = (value: 'accepted' | 'declined') => {
    setClientConsent(value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-3 sm:px-4 sm:pb-4"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur shadow-2xl p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 bg-green-500/10 rounded-full p-2">
            <Cookie className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">We use cookies to personalize your shopping</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Accept and we&apos;ll show product picks based on what you browse. Decline and you can still shop normally — you just won&apos;t get personalized recommendations. See our{' '}
              <Link href="/Privacy" className="underline hover:text-green-600 dark:hover:text-green-400">Privacy Policy</Link>.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => choose('accepted')}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => choose('declined')}
              >
                Decline
              </Button>
            </div>
          </div>
          <button
            onClick={() => choose('declined')}
            aria-label="Dismiss"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
