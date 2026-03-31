import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zyra - Cybersecurity Operations Platform",
  description: "Modern security operations for teams that need speed",
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
