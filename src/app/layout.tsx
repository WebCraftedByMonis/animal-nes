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




export const metadata: Metadata = {
  title: {
    template: "%s | Animal Wellness",
    absolute: "Animal Wellness",
  },
  description: "A full-stack e-commerce application built with Next.js 15",
  keywords: "vet doctor",
  openGraph: {
    images: ["/logo.jpg"]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en"  suppressHydrationWarning>
      <body
        className={poppins.className}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
             <SessionWrapper>
                <ProgressBar />
        <Navbar/>
         <Toaster position="top-center" />
        {children}
        <Footer/>
        </SessionWrapper>
        <ToastContainer position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
