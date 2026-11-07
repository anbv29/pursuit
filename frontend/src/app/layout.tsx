import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { FeedbackProvider } from "@/components/feedback";
import { OfflineNotice } from "@/components/offline-notice";
import { ReadingProvider } from "@/components/reading-mode";
import { SessionProvider } from "@/components/session";
import "./globals.css";

const ui = Inter({ variable: "--font-interface", subsets: ["latin"], display: "swap" });
const code = JetBrains_Mono({ variable: "--font-code", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Pursuit", template: "%s · Pursuit" },
  description: "Every claim has a receipt. Pursuit links research sources, flags unverified claims and keeps your market research and real test results together.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#151c19" },
  ],
};

// Applies a saved theme choice before first paint so the page never flashes the wrong theme.
const themeScript = `try{var t=localStorage.getItem("pursuit.theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${ui.variable} ${code.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full font-sans text-[15px]">
        <SessionProvider>
          <ReadingProvider><FeedbackProvider>{children}</FeedbackProvider></ReadingProvider>
        </SessionProvider>
        <OfflineNotice />
      </body>
    </html>
  );
}
