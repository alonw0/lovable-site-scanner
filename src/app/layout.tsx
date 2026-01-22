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
  title: "Supabase Site Scanner",
  description: "A simple app to scan websites for Supabase usage and publicly accessible data. Use ethically and with permission.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Supabase Site Scanner",
    description: "A simple app to scan websites for Supabase usage and publicly accessible data.",
    url: "https://supabase-site-scanner.vercel.app",
    siteName: "Supabase Site Scanner",
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
    title: "Supabase Site Scanner",
    description: "A simple app to scan websites for Supabase usage and publicly accessible data.",
    images: ["/cover.jpeg"],
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
