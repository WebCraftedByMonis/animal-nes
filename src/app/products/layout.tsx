import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Properties",
  description: "A full-stack e-commerce application built with Next.js 15",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children
}
