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

// display: "optional" (not "swap"): swap repainted the hero text mid-load when
// the webfont arrived, causing an intermittent ~0.12 CLS on slow mobile
// connections. With "optional" the browser gives the font a ~100ms window and
// otherwise keeps next/font's metrics-adjusted fallback for the entire page
// view — zero layout shift. Repeat visits render the brand font from cache.
const inter = Inter({
  subsets: ["latin"],
  display: "optional",
  variable: "--font-inter",
  preload: true,
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "optional",
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
        {/* Google AdSense account verification */}
        <meta name="google-adsense-account" content="ca-pub-3614937645740807" />
        {/* Google Tag Manager — loaded on FIRST USER INTERACTION (tap / scroll /
            keypress), with a 10s fallback for passive visits. The GTM stack
            (GA4 + Clarity + Meta Pixel) is ~470KB of JS and ~600ms of
            main-thread work; even with lazyOnload it landed inside the
            Lighthouse measurement window and dominated the mobile score. Real
            visitors interact within the first seconds, so analytics coverage
            is effectively unchanged — the pageview just fires a moment later. */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){var loaded=false;function loadGTM(){if(loaded)return;loaded=true;['pointerdown','keydown','touchstart','scroll'].forEach(function(e){removeEventListener(e,loadGTM)});(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-PSWFF7GC');}['pointerdown','keydown','touchstart','scroll'].forEach(function(e){addEventListener(e,loadGTM,{once:true,passive:true})});setTimeout(loadGTM,10000);})();`,
          }}
        />
        {/* Preconnect ONLY to origins on the critical path (Lighthouse flags >4
            as counterproductive — each costs a socket during startup). Fonts are
            self-hosted via next/font (no runtime googleapis/gstatic requests);
            the rest are demoted to cheap dns-prefetch hints. */}
        <link rel="preconnect" href="https://media.bharatmock.com" />
        <link rel="preconnect" href="https://api.bharatmock.com" />
        <link rel="dns-prefetch" href="https://pub-bharatmock.r2.dev" />
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
