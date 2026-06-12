import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import "../index.css";
import { Providers } from "./providers";
import { ScrollToTopButton } from "@/components/common/ScrollToTopButton";
import { ServiceWorkerRegistration } from "@/components/common/ServiceWorkerRegistration";
import { WebVitals } from "@/components/common/WebVitals";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  preload: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://bharatmock.com"),
  title: {
    default: "BharatMock — India's Smart Exam Companion",
    template: "%s",
  },
  authors: [{ name: "BharatMock" }],
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32", type: "image/x-icon" },
      { url: "/favicon.jpg", type: "image/jpeg" },
    ],
    apple: [{ url: "/favicon.jpg" }],
  },
  openGraph: {
    title: "BharatMock — India's Smart Exam Companion",
    type: "website",
    url: "https://bharatmock.com",
    siteName: "BharatMock",
    images: [{ url: "/assets/login_banner_image.jpg", width: 800, height: 534 }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@BharatMock",
    images: ["/assets/login_banner_image.jpg"],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <head>
        {/* Google Tag Manager */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-PSWFF7GC');`,
          }}
        />
        {/* Preconnect to critical third-party origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://media.bharatmock.com" />
        <link rel="preconnect" href="https://api.bharatmock.com" />
        <link rel="preconnect" href="https://pub-bharatmock.r2.dev" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {/* Google Tag Manager (noscript) */}
        <noscript dangerouslySetInnerHTML={{ __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PSWFF7GC" height="0" width="0" style="display:none;visibility:hidden"></iframe>` }} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            {children}
            <ScrollToTopButton />
            <ServiceWorkerRegistration />
            <WebVitals />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
