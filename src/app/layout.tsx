import type { Metadata } from "next";
import { poppins } from "./fonts";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/Navbar";
import SessionWrapper from "../components/sessionWrapper";
import ProgressBar from "@/components/ProgressBar";
import { Toaster } from 'react-hot-toast'
import Footer from "@/components/Footer";
import { CartProvider } from "@/contexts/CartContext";
import { LoginModalProvider } from "@/contexts/LoginModalContext";
import LoginModal from "@/components/LoginModal";
import BallotingModal from "@/components/BallotingModal";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.animalwellness.shop"),
  title: {
    template: "%s | Animal Wellness - Complete Veterinary Solutions",
    default: "Animal Wellness - Complete Veterinary Solutions & Pet Care Products",
  },
  description: "Your trusted partner for comprehensive animal wellness solutions. Find veterinary products, connect with qualified doctors, browse job opportunities, and discover quality pet care products. Complete veterinary marketplace for professionals and pet owners.",
  keywords: [
    "animal wellness", "veterinary products", "pet care", "veterinary supplies",
    "animal healthcare", "veterinary medicine", "pet products", "animal doctors",
    "veterinary jobs", "animal hospital", "pet health", "veterinary services",
    "animal nutrition", "pet pharmacy", "veterinary equipment"
  ],
  authors: [{ name: "Animal Wellness Team" }],
  creator: "Animal Wellness",
  publisher: "Animal Wellness",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.animalwellness.shop",
    title: "Animal Wellness - Complete Veterinary Solutions & Pet Care",
    description: "Your trusted partner for comprehensive animal wellness solutions. Find veterinary products, connect with qualified doctors, and discover quality pet care products.",
    images: [
      {
        url: "/logo.jpg",
        width: 1200,
        height: 630,
        alt: "Animal Wellness - Complete Veterinary Solutions",
      }
    ],
    siteName: "Animal Wellness",
  },
  twitter: {
    card: "summary_large_image",
    title: "Animal Wellness - Complete Veterinary Solutions",
    description: "Your trusted partner for comprehensive animal wellness solutions. Find veterinary products, connect with qualified doctors, and discover quality pet care products.",
    images: ["/logo.jpg"],
  },
  alternates: {
    canonical: "/",
  },
  verification: {
    google: "your-google-verification-code", // Add your Google verification code
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="/_next/static/media/fe0777f1195381cb-s.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className={poppins.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionWrapper>
            <CartProvider>
              <LoginModalProvider>
                <ProgressBar />
                {/* Main layout container */}
                <div className="min-h-screen flex flex-col">
                  <Navbar />
                  <Toaster position="top-center" />
                  <LoginModal />
                  <BallotingModal />

                  {/* Main content with padding-top to account for fixed navbar */}
                  <main className="flex-1 pt-14 sm:pt-16">
                    {children}
                  </main>

                  <Footer />
                </div>
              </LoginModalProvider>
            </CartProvider>
          </SessionWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}