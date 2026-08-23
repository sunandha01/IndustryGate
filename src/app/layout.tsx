import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import Navbar from "@/components/navbar";
import "./globals.css";

// SRM's own site uses "Source Sans Pro"; Source_Sans_3 is its current
// Google Fonts successor (same family, actively maintained).
const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SRM Industry Mentor Portal",
  description: "Connect SRM events with industry mentors, sponsors, and judges.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sourceSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
