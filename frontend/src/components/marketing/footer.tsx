import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand";
import styles from "./studio.module.css";

const links = [
  { title: "Explore", items: [
    { label: "Public sample report", href: "/sample" },
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
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[1.4fr_1fr] lg:gap-20">
          <div>
            <h2 className="max-w-lg text-balance font-display text-4xl font-medium leading-tight tracking-[-0.04em] text-ink sm:text-5xl">
              Every claim<br className="hidden sm:block" /> has a receipt.
            </h2>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-ink-2">Inspect the source. Spot the assumption. Decide what needs testing.</p>
            <Link href="/sample" className="group mt-5 inline-flex min-h-11 items-center gap-3 rounded-sm font-ui text-sm font-semibold text-trail underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)]">
              Read a real research brief
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden />
            </Link>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-6 lg:pt-2">
            {links.map((group) => (
              <div key={group.title}>
                <h3 className="mb-3 text-sm font-semibold text-ink-3">{group.title}</h3>
                <ul>
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="group inline-flex min-h-11 items-center gap-2 rounded-sm py-2 text-sm text-ink-2 transition-colors hover:text-trail focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)]">
                        <span>{item.label}</span><ArrowUpRight className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
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
