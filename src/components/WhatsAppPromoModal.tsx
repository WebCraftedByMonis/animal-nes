'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FaWhatsapp } from 'react-icons/fa';
import { X } from 'lucide-react';
import { useCountry } from '@/contexts/CountryContext';

const WHATSAPP_NUMBERS: Record<string, string> = {
  Pakistan: '+923354145431',
  UAE: '+971547478202',
};

const STORAGE_KEY = 'petzsee_whatsapp_subscribed';

export default function WhatsAppPromoModal() {
  const [open, setOpen] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const { country } = useCountry();

  const phoneNumber = WHATSAPP_NUMBERS[country] ?? WHATSAPP_NUMBERS.Pakistan;
  const displayNumber = phoneNumber;

  // Auto-open after 4 s, but only if user hasn't already subscribed
  useEffect(() => {
    const alreadySubscribed = localStorage.getItem(STORAGE_KEY);
    if (alreadySubscribed) return;

    const timer = setTimeout(() => setOpen(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleJoin = () => {
    const digits = phoneNumber.replace(/\D/g, '');
    const message = encodeURIComponent('Hi! I want to join the Petzsee WhatsApp promotions list.');
    window.open(`https://wa.me/${digits}?text=${message}`, '_blank', 'noopener,noreferrer');
    localStorage.setItem(STORAGE_KEY, 'true');
    setSubscribed(true);
  };

  const handleClose = () => {
    setOpen(false);
    // Reset subscribed state when dialog fully closes so it's clean next time
    setTimeout(() => setSubscribed(false), 300);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className="sm:max-w-sm p-0 overflow-hidden rounded-2xl border-0 shadow-2xl [&>button:last-of-type]:hidden"
      >
        {/* Header stripe */}
        <div className="relative bg-[#25D366] px-6 pt-6 pb-5 text-white">
          {/* Custom close button */}
          <button
            onClick={handleClose}
            aria-label="Close"
            className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-1">
            <div className="bg-white/20 rounded-full p-2">
              <FaWhatsapp className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-wider opacity-90">
              WhatsApp Offers
            </span>
          </div>

          <h2 className="text-xl font-bold leading-tight mt-2">
            Join our WhatsApp<br />Promotion list
          </h2>
          <p className="text-sm text-white/85 mt-1">
            Get exclusive offers and updates directly on WhatsApp.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 bg-background">
          {!subscribed ? (
            <>
              {/* Phone number display */}
              <div className="flex items-center gap-2 bg-muted rounded-lg px-4 py-3 mb-4">
                <FaWhatsapp className="w-5 h-5 text-[#25D366] shrink-0" />
                <span className="text-sm font-mono font-medium tracking-wide text-foreground">
                  {displayNumber}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {country}
                </span>
              </div>

              <Button
                onClick={handleJoin}
                className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold text-sm h-11 rounded-lg gap-2"
              >
                <FaWhatsapp className="w-5 h-5" />
                Join on WhatsApp
              </Button>

              <p className="text-center text-xs text-muted-foreground mt-3">
                You&apos;ll be redirected to WhatsApp to confirm.
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className="text-4xl">🎉</div>
              <p className="text-sm font-semibold text-foreground">
                You have been subscribed to Petzsee WhatsApp offers!
              </p>
              <p className="text-xs text-muted-foreground">
                Expect exclusive deals &amp; updates right on WhatsApp.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={handleClose}
              >
                Got it
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
