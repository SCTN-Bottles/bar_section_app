import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "SECTN",
  description:
    "Venue section reservations powered by SECTN.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}