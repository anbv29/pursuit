"use client";

import "./globals.css";

/** Last-resort boundary when the root layout itself fails. Renders its own document. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center px-4 font-sans">
        <div className="glass w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Pursuit couldn&apos;t load</h1>
          <p className="mt-2 text-[15px] text-ink-2">Something went wrong while starting the app. Your data is safe.</p>
          <button type="button" onClick={() => retry()}
            className="press mt-6 inline-flex h-10 items-center rounded-xl bg-accent-strong px-4 text-sm font-medium text-accent-ink">
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
