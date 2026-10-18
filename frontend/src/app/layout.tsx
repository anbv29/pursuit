import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FeedbackProvider } from "@/components/feedback";
import { SessionProvider } from "@/components/session";
import { ReadingProvider } from "@/components/reading-mode";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Pursuit", template: "%s · Pursuit" },
  description: "Turn go-to-market hunches into experiments, evidence and decisions.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-[15px]">
        <SessionProvider>
          <ReadingProvider><FeedbackProvider>{children}</FeedbackProvider></ReadingProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
