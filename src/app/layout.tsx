import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flaky Egg Distributor",
  description: "Sales, stock, customers and money for Flaky Egg Distributor",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Flaky Egg", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#2f9e6e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
