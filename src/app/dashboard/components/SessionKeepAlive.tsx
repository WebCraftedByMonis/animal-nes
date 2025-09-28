'use client';

import { useEffect } from 'react';

export function SessionKeepAlive() {
  useEffect(() => {
    let activityTimer: NodeJS.Timeout;

    const extendSession = async () => {
      try {
        // Make a lightweight API call to extend session
        await fetch('/api/extend-session', {
          method: 'POST',
          credentials: 'include'
        });
      } catch (error) {
        console.error('Failed to extend session:', error);
      }
    };

    const resetTimer = () => {
      clearTimeout(activityTimer);
      // Extend session after 10 minutes of activity
      activityTimer = setTimeout(extendSession, 10 * 60 * 1000);
    };

    // Activity events to track
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    // Start the timer
    resetTimer();

    // Cleanup
    return () => {
      clearTimeout(activityTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, []);

  return null;
}