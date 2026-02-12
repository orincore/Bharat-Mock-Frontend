"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const STORAGE_KEY = 'auth_reminder_dismissed';
const REMINDER_DELAY_MS = 60_000; // 1 minute

export function AuthReminderDialog() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isAuthenticated) {
      setOpen(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      return;
    }

    const alreadyDismissed = sessionStorage.getItem(STORAGE_KEY) === 'true';
    if (alreadyDismissed || open) return;

    timerRef.current = setTimeout(() => {
      setOpen(true);
    }, REMINDER_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isAuthenticated, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (typeof window !== 'undefined' && !nextOpen) {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    }
    setOpen(nextOpen);
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unlock the full Bharat Mock experience</DialogTitle>
          <DialogDescription>
            Log in or create a free account to view all premium content and attempt any exam on the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Link href="/login" className="block">
            <Button className="w-full" size="lg">
              Log in
            </Button>
          </Link>
          <Link href="/register" className="block">
            <Button className="w-full" size="lg" variant="secondary">
              Sign up for free
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground text-center">
            Continue browsing freely, but you&apos;ll need an account to access premium material and attempt exams.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
