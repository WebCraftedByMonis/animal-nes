'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

const HISTATS_SITE_ID = '5059500';

// Histats only counts a hit when its script first loads. Next.js navigates
// client-side, so every later pathname change has to push track_hits again
// by hand or the visit is lost.
export default function HistatsAnalytics() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    // First render: the inline script below already queues the initial hit.
    if (lastTrackedPath.current === null) {
      lastTrackedPath.current = pathname;
      return;
    }
    if (lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;
    window._Hasync = window._Hasync || [];
    window._Hasync.push(['Histats.track_hits', '']);
  }, [pathname]);

  if (process.env.NODE_ENV !== 'production') return null;

  return (
    <>
      <Script id="histats-analytics" strategy="afterInteractive">
        {`
          var _Hasync = window._Hasync = window._Hasync || [];
          _Hasync.push(['Histats.start', '1,${HISTATS_SITE_ID},4,0,0,0,00010000']);
          _Hasync.push(['Histats.fasi', '1']);
          _Hasync.push(['Histats.track_hits', '']);
          (function() {
            var hs = document.createElement('script');
            hs.type = 'text/javascript';
            hs.async = true;
            hs.src = 'https://s10.histats.com/js15_as.js';
            (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(hs);
          })();
        `}
      </Script>
      <noscript>
        <a href="/" target="_blank">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://sstatic1.histats.com/0.gif?${HISTATS_SITE_ID}&101`}
            alt="free web stats"
            style={{ border: 0 }}
          />
        </a>
      </noscript>
    </>
  );
}
