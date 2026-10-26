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
  description: "Research customers, competitors and pricing. Turn findings into measurable experiments, track evidence and decide what to test next with Pursuit.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#101214" },
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
