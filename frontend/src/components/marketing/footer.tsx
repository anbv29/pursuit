import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand";

const links = [
  { title: "Explore", items: [
    { label: "Process", href: "/#how-it-works" },
    { label: "What you can do", href: "/#capabilities" },
    { label: "The toolkit", href: "/#pricing" },
  ] },
  { title: "Your next move", items: [
    { label: "Create an account", href: "/signup" },
    { label: "Sign in", href: "/login" },
    { label: "Your workspace", href: "/w" },
  ] },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-sunken/50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[1.4fr_1fr] lg:gap-20">
          <div>
            <p className="mb-4 font-ui text-xs font-semibold uppercase tracking-[0.12em] text-trail">A little less guesswork.</p>
            <h2 className="max-w-lg text-balance font-display text-3xl font-medium leading-tight tracking-[-0.045em] text-ink sm:text-4xl">
              Make your next move<br className="hidden sm:block" /> an informed one.
            </h2>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-ink-2">Understand your market. Question your assumptions. Find what deserves your time.</p>
            <Link href="/#how-it-works" className="group mt-5 inline-flex min-h-11 items-center gap-3 rounded-sm font-ui text-sm font-semibold text-trail underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)]">
              See how Pursuit works
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden />
            </Link>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-6 lg:pt-2">
            {links.map((group) => (
              <div key={group.title}>
                <h3 className="mb-3 font-ui text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">{group.title}</h3>
                <ul>
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="group inline-flex min-h-11 items-center gap-2 rounded-sm text-sm text-ink-2 transition-colors hover:text-trail focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)]">
                        {item.label}<ArrowUpRight className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-5 border-t border-line py-6 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <p className="text-sm text-ink-3">Research. Test. Move forward.</p>
          <p className="text-xs text-ink-3">© Pursuit. Built for curious founders.</p>
        </div>
      </div>
    </footer>
  );
}
