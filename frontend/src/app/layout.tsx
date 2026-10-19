import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { BackdropOrbs } from "@/components/backdrop";
import { FeedbackProvider } from "@/components/feedback";
import { LensLoader } from "@/components/lens-loader";
import { OfflineNotice } from "@/components/offline-notice";
import { ReadingProvider } from "@/components/reading-mode";
import { SessionProvider } from "@/components/session";
import "./globals.css";

const display = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["500", "700"] });
const body = Figtree({ variable: "--font-figtree", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: { default: "Pursuit", template: "%s · Pursuit" },
  description: "Say who you want to meet. Pursuit finds them, explains why they fit, and helps you book the call.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e6f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#061417" },
  ],
};

// Applies a saved theme choice before first paint so the page never flashes the wrong theme.
const themeScript = `try{var t=localStorage.getItem("pursuit.theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable} h-full antialiased`}>
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
