import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Veterinary Products | Animal Wellness",
  description: "Browse our comprehensive selection of high-quality veterinary products and animal wellness supplies",
  keywords: ["veterinary products", "animal wellness", "pet supplies", "livestock supplies"],
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children
}
