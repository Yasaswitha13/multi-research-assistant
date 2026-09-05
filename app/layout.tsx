import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Research Agent",
  description: "Ask a question, get a structured research report.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
