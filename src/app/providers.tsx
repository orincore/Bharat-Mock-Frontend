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
import { Footer } from "@/components/common/Footer";
import { AuthReminderDialog } from "@/components/common/AuthReminderDialog";
import { GoogleTranslate } from "@/components/common/GoogleTranslate";
import { SubscriptionPromoBanner } from "@/components/common/SubscriptionPromoBanner";
import { LoadingSpinner } from "@/components/common/LoadingStates";
import { apolloClient } from "@/lib/graphql/client";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Ban } from "lucide-react";

function BlockedAccountGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (user?.is_blocked) {
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
              {user.block_reason ? ':' : '.'}
            </p>
            {user.block_reason && (
              <p className="text-destructive font-semibold">“{user.block_reason}”</p>
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
              <main
                className={`flex-grow ${
                  hideChrome ? "min-h-screen bg-background" : ""
                }`}
              >
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
  const [queryClient] = useState(() => new QueryClient());

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
