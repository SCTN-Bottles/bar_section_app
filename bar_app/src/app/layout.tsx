import type { Metadata } from "next";

import VenueDataProvider from "@/components/providers/VenueDataProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "SCTN",
  description:
    "Venue section reservations powered by SCTN.",
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
