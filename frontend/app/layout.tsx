import { Inter } from "next/font/google";

import "./globals.css";

import type { Metadata } from "next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Latest News Agent",
  description: "AI-powered news chat assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html className={inter.variable} lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
