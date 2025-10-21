'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function BallotingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Show modal after 20 seconds initially
    const initialTimer = setTimeout(() => {
      setIsOpen(true);
    }, 20000); // 20 seconds

    // Set up recurring timer
    const recurringTimer = setInterval(() => {
      setIsOpen(true);
    }, 20000); // Every 20 seconds

    // Cleanup timers on unmount
    return () => {
      clearTimeout(initialTimer);
      clearInterval(recurringTimer);
    };
  }, []);

  const handleRegister = () => {
    setIsOpen(false);
    router.push('/addPartner');
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-green-600">
            Participate in Balloting!
          </DialogTitle>
          <DialogDescription className="text-base pt-4">
            Register yourself and win exciting prizes! Don't miss this amazing opportunity to be part of our balloting event.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleRegister}
            className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
          >
            Register Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
