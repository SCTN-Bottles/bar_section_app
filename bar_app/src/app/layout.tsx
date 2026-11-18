

// Establish cascade layers before the generated theme module imports its CSS.
import "./globals.css";
import type { Metadata } from "next";

import AstryxProvider from "@/components/providers/AstryxProvider";
import VenueDataProvider from "@/components/providers/VenueDataProvider";

import "@fontsource/figtree/latin-400.css";
import "@fontsource/figtree/latin-500.css";
import "@fontsource/figtree/latin-600.css";
import "@fontsource/figtree/latin-700.css";

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
    <html lang="en" data-astryx-theme="sctn" data-theme="dark">
      <body>
        <AstryxProvider><VenueDataProvider>{children}</VenueDataProvider></AstryxProvider>
      </body>
    </html>
  );
}
