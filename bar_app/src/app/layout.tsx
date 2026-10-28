import type { Metadata } from "next";

import VenueDataProvider from "@/components/providers/VenueDataProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "SCTN",
  applicationName: "SCTN",
  description: "Reservations powered by SCTN.",
  openGraph: {
    title: "SCTN",
    siteName: "SCTN",
    description: "Reservations powered by SCTN.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SCTN",
    description: "Reservations powered by SCTN.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><VenueDataProvider>{children}</VenueDataProvider></body>
    </html>
  );
}
