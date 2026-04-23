import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "../index.css";
import { Providers } from "./providers";
import { ScrollToTopButton } from "@/components/common/ScrollToTopButton";
import { ServiceWorkerRegistration } from "@/components/common/ServiceWorkerRegistration";

// Only load the two fonts actually used in tailwind.config.ts
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
  maximumScale: 5,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://bharatmock.com"),
  title: {
    default: "Bharat Mock — India's Smart Exam Companion",
    template: "%s | Bharat Mock",
  },
  authors: [{ name: "Bharat Mock" }],
  robots: { index: true, follow: true },
  icons: {
    icon: "/favicon.jpg",
    shortcut: "/favicon.jpg",
    apple: "/favicon.jpg",
  },
  openGraph: {
    title: "Bharat Mock — India's Smart Exam Companion",
    type: "website",
    url: "https://bharatmock.com",
    siteName: "Bharat Mock",
    images: [{ url: "/assets/login_banner_image.jpg", width: 800, height: 534 }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@BharatMock",
    images: ["/assets/login_banner_image.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <head>
        {/* Google Tag Manager */}
        <script dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-PSWFF7GC');` }} />
        {/* End Google Tag Manager */}
        {/* Preconnect to critical third-party origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://media.bharatmock.com" />
        <link rel="preconnect" href="https://api.bharatmock.com" />
        {/* Preconnect to R2 bucket for fast image loads */}
        <link rel="preconnect" href="https://pub-bharatmock.r2.dev" crossOrigin="anonymous" />

        {/* DNS prefetch for non-critical origins */}
        <link rel="dns-prefetch" href="https://translate.google.com" />
        <link rel="dns-prefetch" href="https://translate.googleapis.com" />
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />

        <link rel="icon" type="image/jpeg" href="/favicon.jpg" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {/* Google Tag Manager (noscript) */}
        <noscript dangerouslySetInnerHTML={{ __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PSWFF7GC" height="0" width="0" style="display:none;visibility:hidden"></iframe>` }} />
        {/* End Google Tag Manager (noscript) */}
        <Providers>
          {children}
          <ScrollToTopButton />
          <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  );
}
