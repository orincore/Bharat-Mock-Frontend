import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../index.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bharat Mock",
  description: "Bharat Mock — India's smart exam preparation companion.",
  authors: [{ name: "Bharat Mock" }],
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: "/favicon.jpg",
    shortcut: "/favicon.jpg",
    apple: "/favicon.jpg",
  },
  openGraph: {
    title: "Bharat Mock",
    description: "Practice mocks, analyze performance, and stay exam-ready with Bharat Mock.",
    type: "website",
    images: ["/placeholder.svg"],
  },
  twitter: {
    card: "summary_large_image",
    site: "@BharatMock",
    images: ["/placeholder.svg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/jpeg" href="/favicon.jpg" />
        <meta name="robots" content="noindex,nofollow" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
