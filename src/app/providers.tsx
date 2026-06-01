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
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Ban, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";

const Footer = dynamic(
  () => import("@/components/common/Footer").then((m) => ({ default: m.Footer }))
);
const AuthReminderDialog = dynamic(
  () => import("@/components/common/AuthReminderDialog").then((m) => ({ default: m.AuthReminderDialog }))
);
const SubscriptionPromoBanner = dynamic(
  () => import("@/components/common/SubscriptionPromoBanner").then((m) => ({ default: m.SubscriptionPromoBanner }))
);

// Lets specific pages (e.g. subcategory/category tab pages) keep the footer visible even when
// the global path heuristic in InnerProviders would otherwise hide it for 2-segment URLs.
const FooterVisibilityContext = createContext<(register: boolean) => void>(() => {});

/**
 * Force the footer to stay visible for as long as the calling component is mounted.
 * Mount/unmount safe — uses a ref-counted registration so concurrent callers don't clash.
 */
export function useFooterVisible() {
  const register = useContext(FooterVisibilityContext);
  useEffect(() => {
    register(true);
    return () => register(false);
  }, [register]);
}

function DeletedAccountGate({ children }: { children: React.ReactNode }) {
  const { isDeleted } = useAuth();

  if (isDeleted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
        <div className="max-w-lg w-full bg-white border border-border rounded-2xl shadow-lg p-8 text-center space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground mx-auto">
            <Trash2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Account Deleted</h1>
            <p className="text-muted-foreground">
              This account has been permanently deleted and is no longer accessible.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            If you believe this is a mistake, please contact our support team for assistance.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

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
  const { refresh: refreshAppData } = useAppData();
  const pathname = usePathname();
  const [forceFooterVisibleCount, setForceFooterVisibleCount] = useState(0);
  const registerFooterVisible = useCallback((register: boolean) => {
    setForceFooterVisibleCount((count) => Math.max(0, count + (register ? 1 : -1)));
  }, []);
  const hideChrome = useMemo(() => {
    if (!pathname) return false;
    // Exactly like dedicated exam attempt views
    return pathname.startsWith("/exams/") && pathname.includes("/attempt/");
  }, [pathname]);

  const hideFooterOnly = useMemo(() => {
    if (!pathname || hideChrome) return false;
    // Hide footer on exam detail/instruction pages which usually follow /[category-slug]/[exam-slug]
    const segments = pathname.split("/").filter(Boolean);
    return segments.length === 2 && !segments[0].startsWith("admin") && !segments[0].startsWith("auth");
  }, [pathname, hideChrome]);

  // Subcategory/category tab pages share the same 2-segment shape as exam-detail pages
  // (/[slug]/[tab]) — including custom tabs with arbitrary slugs — so the path heuristic
  // above wrongly hides their footer. Those pages opt the footer back in via useFooterVisible().
  const footerForcedVisible = forceFooterVisibleCount > 0;

  return (
    <AuthProvider onAuthChange={refreshAppData}>
      <ExamProvider>
        <TooltipProvider>
          <FooterVisibilityContext.Provider value={registerFooterVisible}>
            <Toaster />
            <Sonner />
            <GoogleTranslate />
            <div className="flex flex-col min-h-screen">
              {!hideChrome && (
                <div className="sticky top-0 z-50">
                  <Navbar />
                </div>
              )}
              {!hideChrome && <SubscriptionPromoBanner />}
              <main className={`flex-grow ${hideChrome ? "min-h-screen bg-background" : ""}`}>
                <DeletedAccountGate>
                  <BlockedAccountGate>
                    {children}
                  </BlockedAccountGate>
                </DeletedAccountGate>
              </main>
              {!hideChrome && (!hideFooterOnly || footerForcedVisible) && <Footer />}
            </div>
            <AuthReminderDialog />
          </FooterVisibilityContext.Provider>
        </TooltipProvider>
      </ExamProvider>
    </AuthProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        gcTime: 0,
        retry: 1,
        refetchOnWindowFocus: false,
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
