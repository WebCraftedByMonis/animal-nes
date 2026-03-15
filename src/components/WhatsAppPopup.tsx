"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function WhatsAppPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("wa_popup_dismissed");
    if (!dismissed) {
      const timer = setTimeout(() => setOpen(true), 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("wa_popup_dismissed", "1");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Green header */}
        <div className="bg-[#25D366] px-6 py-5 text-white">
          <button onClick={dismiss} className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-3 mb-1">
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <div>
              <h2 className="text-xl font-bold">Stay Connected!</h2>
              <p className="text-white/80 text-sm">Join our AnimalWellness community</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-gray-600 text-sm">
            Get exclusive deals, health tips, and the latest updates on animal care — directly on WhatsApp.
          </p>

          {/* Community */}
          <a
            href="https://chat.whatsapp.com/CqLyuyp92ex6cZ7EtpfwaU"
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="flex items-center gap-4 p-4 border-2 border-[#25D366] rounded-xl hover:bg-[#25D366]/5 transition-colors group"
          >
            <div className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 group-hover:text-[#25D366] transition-colors">Join Community</p>
              <p className="text-xs text-gray-500">Chat with fellow animal lovers & get support</p>
            </div>
            <span className="text-[#25D366] text-xs font-bold">JOIN →</span>
          </a>

          {/* Channel */}
          <a
            href="https://whatsapp.com/channel/0029VaeV6OQ9mrGjhvOQkW2t"
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-[#25D366] hover:bg-[#25D366]/5 transition-colors group"
          >
            <div className="w-10 h-10 bg-gray-100 group-hover:bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0 transition-colors">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-gray-500 group-hover:fill-white transition-colors"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 group-hover:text-[#25D366] transition-colors">Follow Channel</p>
              <p className="text-xs text-gray-500">Receive updates, offers & news broadcasts</p>
            </div>
            <span className="text-gray-400 group-hover:text-[#25D366] text-xs font-bold transition-colors">FOLLOW →</span>
          </a>

          <button onClick={dismiss} className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors pt-1">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
