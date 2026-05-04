import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import StorefrontLayoutWrapper from "@/components/shared/StorefrontLayoutWrapper";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Ghana Market",
  description: "Best prices in West Africa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground`}>
        <Providers>
            <StorefrontLayoutWrapper>
              {children}
            </StorefrontLayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}

