import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/Navbar";
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import SessionWrapper from "../components/sessionWrapper";
import ProgressBar from "@/components/ProgressBar";
import { Toaster } from 'react-hot-toast'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Animal Nexus",
    absolute: "Animal Nexus",
  },
  description: "A full-stack e-commerce application built with Next.js 15",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en"  suppressHydrationWarning>
      <body
        className={`${geistSans.variable}  ${geistMono.variable} antialiased`}
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
        {children}</SessionWrapper>
        <ToastContainer position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
