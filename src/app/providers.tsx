"use client";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApolloProvider } from "@apollo/client/react";
import { AuthProvider } from "@/context/AuthContext";
import { ExamProvider } from "@/context/ExamContext";
import { AppDataProvider, useAppData } from "@/context/AppDataContext";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { apolloClient } from "@/lib/graphql/client";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

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
          <div className="flex flex-col min-h-screen">
            {!hideChrome && <Navbar />}
            <main className={`flex-grow ${hideChrome ? "min-h-screen bg-background" : ""}`}>
              {children}
            </main>
            {!hideChrome && <Footer />}
          </div>
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
