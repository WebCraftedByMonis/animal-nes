'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FaWhatsapp } from 'react-icons/fa';
import { X, Users, Radio } from 'lucide-react';
import { useCountry } from '@/contexts/CountryContext';

const WHATSAPP_NUMBERS: Record<string, string> = {
  Pakistan: '+923354145431',
  UAE: '+971547478202',
};

const STORAGE_KEY = 'petzsee_whatsapp_subscribed';
const COMMUNITY_LINK = 'https://chat.whatsapp.com/CqLyuyp92ex6cZ7EtpfwaU';
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029VaeV6OQ9mrGjhvOQkW2t';

export default function WhatsAppPromoModal() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const { country } = useCountry();

  const phoneNumber = WHATSAPP_NUMBERS[country] ?? WHATSAPP_NUMBERS.Pakistan;

  useEffect(() => {
    const already = localStorage.getItem(STORAGE_KEY);
    if (already) return;
    const timer = setTimeout(() => setOpen(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
    setTimeout(() => setDone(false), 300);
  };

  const handleJoinPromo = () => {
    const digits = phoneNumber.replace(/\D/g, '');
    const msg = encodeURIComponent('Hi! I want to join the AnimalWellness WhatsApp promotions list.');
    window.open(`https://wa.me/${digits}?text=${msg}`, '_blank', 'noopener,noreferrer');
    setDone(true);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-2xl border-0 shadow-2xl [&>button:last-of-type]:hidden">
        {/* Header */}
        <div className="relative bg-[#25D366] px-6 pt-6 pb-5 text-white">
          <button onClick={handleClose} aria-label="Close"
            className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-white/20 rounded-full p-2">
              <FaWhatsapp className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-wider opacity-90">AnimalWellness</span>
          </div>
          <h2 className="text-xl font-bold leading-tight mt-2">Stay Connected on WhatsApp!</h2>
          <p className="text-sm text-white/85 mt-1">Join our community, follow our channel & get exclusive offers.</p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 bg-background space-y-3">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className="text-4xl">🎉</div>
              <p className="text-sm font-semibold">You&apos;re all set!</p>
              <p className="text-xs text-muted-foreground">Expect exclusive deals &amp; updates right on WhatsApp.</p>
              <Button variant="outline" size="sm" className="mt-1" onClick={handleClose}>Got it</Button>
            </div>
          ) : (
            <>
              {/* Community */}
              <a href={COMMUNITY_LINK} target="_blank" rel="noopener noreferrer" onClick={() => setDone(true)}
                className="flex items-center gap-3 p-3 border-2 border-[#25D366] rounded-xl hover:bg-[#25D366]/5 transition-colors group">
                <div className="w-9 h-9 bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-[#25D366] transition-colors">Join Community</p>
                  <p className="text-xs text-muted-foreground">Chat with animal lovers &amp; get support</p>
                </div>
                <span className="text-[#25D366] text-xs font-bold">JOIN →</span>
              </a>

              {/* Channel */}
              <a href={CHANNEL_LINK} target="_blank" rel="noopener noreferrer" onClick={() => setDone(true)}
                className="flex items-center gap-3 p-3 border-2 border-muted rounded-xl hover:border-[#25D366] hover:bg-[#25D366]/5 transition-colors group">
                <div className="w-9 h-9 bg-muted group-hover:bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0 transition-colors">
                  <Radio className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-[#25D366] transition-colors">Follow Channel</p>
                  <p className="text-xs text-muted-foreground">Get updates, offers &amp; news broadcasts</p>
                </div>
                <span className="text-muted-foreground group-hover:text-[#25D366] text-xs font-bold transition-colors">FOLLOW →</span>
              </a>

              {/* Promo list via WhatsApp direct */}
              <Button onClick={handleJoinPromo}
                className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold text-sm h-10 rounded-lg gap-2">
                <FaWhatsapp className="w-4 h-4" />
                Get Exclusive Offers on WhatsApp
              </Button>

              <button onClick={handleClose} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors pt-1">
                Maybe later
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
