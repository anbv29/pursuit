import type { Metadata, Viewport } from "next";
import { Sora, Manrope, Source_Sans_3 } from "next/font/google";
import { BackdropOrbs } from "@/components/backdrop";
import { FeedbackProvider } from "@/components/feedback";
import { LensLoader } from "@/components/lens-loader";
import { OfflineNotice } from "@/components/offline-notice";
import { ReadingProvider } from "@/components/reading-mode";
import { SessionProvider } from "@/components/session";
import "./globals.css";

const display = Sora({ variable: "--font-editorial", subsets: ["latin"], display: "swap" });
const ui = Manrope({ variable: "--font-interface", subsets: ["latin"], display: "swap" });
const body = Source_Sans_3({ variable: "--font-reading", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Pursuit", template: "%s · Pursuit" },
  description: "Research customers, competitors and pricing. Turn findings into measurable experiments, track evidence and decide what to test next with Pursuit.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#101726" },
  ],
};

// Applies a saved theme choice before first paint so the page never flashes the wrong theme.
const themeScript = `try{var t=localStorage.getItem("pursuit.theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${ui.variable} ${body.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full font-sans text-[15px]">
        <BackdropOrbs />
        <SessionProvider>
          <ReadingProvider><FeedbackProvider>{children}</FeedbackProvider></ReadingProvider>
        </SessionProvider>
        <OfflineNotice />
        <LensLoader />
      </body>
    </html>
  );
}
