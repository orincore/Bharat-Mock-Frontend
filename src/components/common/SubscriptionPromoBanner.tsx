"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Megaphone, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// Hardcoded Flash Offer prices
const FLASH_OFFER_NORMAL_PRICE = 499; // ₹499
const FLASH_OFFER_SALE_PRICE = 99; // ₹99
const DISMISSED_KEY = 'flash_offer_banner_dismissed';

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export function SubscriptionPromoBanner() {
  const [visible, setVisible] = useState<boolean>(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const priceStack = (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[10px] sm:text-base text-white/70 line-through">
        {formatPrice(FLASH_OFFER_NORMAL_PRICE)}
      </span>
      <span className="text-xs sm:text-lg font-semibold text-amber-200">
        {formatPrice(FLASH_OFFER_SALE_PRICE)}
      </span>
    </span>
  );

  const handleClose = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  const handleEnrollClick = (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('show-upsell-dialog'));
      router.push('/subscriptions');
    }
  };

  if (!visible || user?.is_premium) return null;

  return (
    <>
      <div className="text-white shadow-lg">
        <div className="relative overflow-hidden bg-gradient-to-r from-[#07142c] via-[#0f1f44] to-[#112b5f]">
          <div className="absolute inset-0 animate-banner-sheen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.15),_transparent_50%)] opacity-60" />
          <div className="container-main relative py-1.5 sm:py-2">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-base pr-8">
              <div className="flex items-center gap-2 sm:gap-3 flex-none">
                <span className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white animate-bounce-subtle flex-shrink-0">
                  <Megaphone className="h-5 w-5" />
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 min-w-0">
                  <p className="hidden sm:block text-[9px] uppercase tracking-[0.35em] text-white/70 whitespace-nowrap">Flash Offer</p>
                  <div className="font-semibold whitespace-nowrap sm:whitespace-normal leading-tight space-y-0.5">
                    <span className="sm:hidden inline-flex flex-wrap items-center gap-2">
                      <span className="text-[11px]">Buy Premium @</span>
                      {priceStack}
                      <span className="text-[11px]">only</span>
                    </span>
                    <span className="hidden sm:inline-flex flex-wrap items-center gap-2">
                      <span>All Exams Test series for 1 year @</span>
                      {priceStack}
                      <span>only</span>
                    </span>
                  </div>
                </div>
              </div>
              <Link
                href="/subscriptions"
                className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] sm:text-sm font-semibold text-[#0b1d3c] shadow-lg shadow-black/20 transition transform hover:-translate-y-0.5 hover:shadow-2xl whitespace-nowrap flex-none"
                onClick={handleEnrollClick}
              >
                Enroll Now
              </Link>
            </div>
            <button
              type="button"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full border border-white/40 text-white/80 hover:bg-white/10"
              onClick={handleClose}
              aria-label="Dismiss subscription banner"
            >
              <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes banner-sheen {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(50%); }
        }
        .animate-banner-sheen {
          animation: banner-sheen 8s linear infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2.4s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
