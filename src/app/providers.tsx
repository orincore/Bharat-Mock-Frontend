"use client";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApolloProvider } from "@apollo/client/react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ExamProvider } from "@/context/ExamContext";
import { AppDataProvider, useAppData } from "@/context/AppDataContext";
import { Navbar } from "@/components/common/Navbar";
import { GoogleTranslate } from "@/components/common/GoogleTranslate";
import { apolloClient } from "@/lib/graphql/client";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Ban } from "lucide-react";
import dynamic from "next/dynamic";

// Lazy-load below-fold / non-critical components — keeps initial JS bundle small
const Footer = dynamic(
  () => import("@/components/common/Footer").then((m) => ({ default: m.Footer })),
  { ssr: false }
);
const AuthReminderDialog = dynamic(
  () => import("@/components/common/AuthReminderDialog").then((m) => ({ default: m.AuthReminderDialog })),
  { ssr: false }
);
const SubscriptionPromoBanner = dynamic(
  () => import("@/components/common/SubscriptionPromoBanner").then((m) => ({ default: m.SubscriptionPromoBanner })),
  { ssr: false }
);

function BlockedAccountGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  // Never block render while loading — show content immediately
  // Only gate once we have confirmed the user is blocked
  if (!isLoading && user?.is_blocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
        <div className="max-w-lg w-full bg-white border border-border rounded-2xl shadow-lg p-8 text-center space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mx-auto">
            <Ban className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Account Suspended</h1>
            <p className="text-muted-foreground">
              Your account access has been temporarily suspended
              {user.block_reason ? ":" : "."}
            </p>
            {user.block_reason && (
              <p className="text-destructive font-semibold">"{user.block_reason}"</p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            If you believe this is a mistake or need help, please contact support for further assistance.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function InnerProviders({ children }: { children: React.ReactNode }) {
  const { profile, isLoading: initLoading } = useAppData();
  const pathname = usePathname();
  const hideChrome = useMemo(() => {
    if (!pathname) return false;
    return pathname.startsWith("/exams/") && pathname.includes("/attempt/");
  }, [pathname]);

  return (
    <AuthProvider initProfile={profile} initProfileLoading={initLoading}>
      <ExamProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <GoogleTranslate />
          <BlockedAccountGate>
            <div className="flex flex-col min-h-screen">
              {!hideChrome && (
                <div className="sticky top-0 z-50">
                  <Navbar />
                  <SubscriptionPromoBanner />
                </div>
              )}
              <main className={`flex-grow ${hideChrome ? "min-h-screen bg-background" : ""}`}>
                {children}
              </main>
              {!hideChrome && <Footer />}
            </div>
            <AuthReminderDialog />
          </BlockedAccountGate>
        </TooltipProvider>
      </ExamProvider>
    </AuthProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,   // 5 min — don't refetch on every mount
        gcTime: 30 * 60 * 1000,     // 30 min — keep in memory
        retry: 1,
        refetchOnWindowFocus: false, // don't hammer API on tab switch
      },
    },
  }));

  return (
    <ApolloProvider client={apolloClient}>
      <QueryClientProvider client={queryClient}>
        <AppDataProvider>
          <InnerProviders>{children}</InnerProviders>
        </AppDataProvider>
      </QueryClientProvider>
    </ApolloProvider>
  );
}
