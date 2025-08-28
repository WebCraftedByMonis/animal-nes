import type { Metadata } from "next";
import { poppins } from "./fonts";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/Navbar";
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import SessionWrapper from "../components/sessionWrapper";
import ProgressBar from "@/components/ProgressBar";
import { Toaster } from 'react-hot-toast'
import Footer from "@/components/Footer";
import { CartProvider } from "@/contexts/CartContext";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.animalwellness.shop"), // 👈 sets your base URL
  title: {
    template: "%s | Animal Wellness",
    default: "Animal Wellness",
  },
  description: "Wellness Home to Your Animals  آس",
  keywords: [ "animal wellness", "veterinary products", "pet care"],
  openGraph: {
    url: "https://www.animalwellness.shop",
    title: "Animal Wellness",
    description: "Wellness Home to Your Animals  آس",
    images: ["/logo.jpg"],
    siteName: "Animal Wellness",
  },
  alternates: {
    canonical: "/", // 👈 homepage canonical (resolves to https://www.animalwellness.shop/)
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={poppins.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionWrapper>
            <CartProvider>
              <ProgressBar />
              {/* Main layout container */}
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <Toaster position="top-center" />
                
                {/* Main content with padding-top to account for fixed navbar */}
                <main className="flex-1 pt-14 sm:pt-16">
                  {children}
                </main>

                <Footer />
              </div>
            </CartProvider>
          </SessionWrapper>
          <ToastContainer position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}