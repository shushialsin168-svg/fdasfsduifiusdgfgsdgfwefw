import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "RESTLESS DIGITAL STORE — Premium Files, Pay with Bakong KHQR",
  description:
    "Premium digital car files with instant delivery. Pay securely with Bakong KHQR and get your download link the moment payment lands.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
