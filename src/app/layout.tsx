import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next"
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lovable Site Scanner",
  description: "A Next.js app to scan websites for Supabase usage and publicly accessible data. Use ethically and with permission.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Lovable Site Scanner",
    description: "A Next.js app to scan websites for Supabase usage and publicly accessible data.",
    url: "https://lovable-site-scanner.vercel.app",
    siteName: "Lovable Site Scanner",
    images: [
      {
        url: "/cover.jpeg",
        width: 1024,
        height: 1024,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lovable Site Scanner",
    description: "A Next.js app to scan websites for Supabase usage and publicly accessible data.",
    images: ["/cover.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
