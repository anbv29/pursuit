import type { ReactNode } from "react";
import { Logo } from "./brand";
import { Glass } from "./ui";

/** Friendly full-page message for 404, errors and similar system states. */
export function SystemCard({ code, title, body, children }: { code?: string; title: string; body: ReactNode; children?: ReactNode }) {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-16">
      <div className="mb-6"><Logo /></div>
      <Glass className="enter-rise w-full max-w-md p-8 text-center">
        {code && <p className="font-display text-6xl font-bold tracking-tight text-trail">{code}</p>}
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">{title}</h1>
        <div className="mt-2 text-[15px] leading-relaxed text-ink-2">{body}</div>
        {children && <div className="mt-7 flex flex-wrap justify-center gap-2">{children}</div>}
      </Glass>
    </main>
  );
}
