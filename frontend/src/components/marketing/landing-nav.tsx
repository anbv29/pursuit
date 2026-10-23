"use client";

import Link from "next/link";
import { Logo } from "../brand";
import { useSession } from "../session";
import { ThemeToggle } from "../theme";
import { buttonStyles, Glass } from "../ui";

/** Session-aware top bar for public pages. */
export function LandingNav() {
  const { user, ready } = useSession();
  return (
    <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6">
      <Glass as="div" className="landing-nav mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 rounded-[16px] px-4 sm:px-5 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <Logo />
        <nav aria-label="Product" className="hidden items-center gap-1 rounded-full border border-line/70 bg-sunken/50 p-1 font-ui text-[13px] font-medium tracking-[0.01em] text-ink-2 lg:flex">
          {[
            ["Process", "/#how-it-works"],
            ["What you can do", "/#capabilities"],
            ["Free access", "/#pricing"],
          ].map(([label, href]) => <Link key={href} href={href} className="group relative inline-flex min-h-10 items-center gap-2 rounded-full px-4 transition-colors hover:bg-surface hover:text-ink focus-visible:bg-surface focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trail motion-reduce:transition-none"><span className="size-1 rounded-full bg-trail opacity-40 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none" aria-hidden />{label}</Link>)}
        </nav>
        <nav aria-label="Account" className="flex items-center justify-end gap-1.5 sm:gap-2 lg:justify-self-end">
          <ThemeToggle />
          <Link href="/#pricing" className="hidden text-sm font-medium text-ink-2 hover:text-ink sm:block lg:hidden">Free access</Link>
          {ready && user ? (
            <><span className="hidden sm:inline-flex"><Link href="/account" className={buttonStyles("ghost", "sm")}>Account</Link></span><Link href="/w" className={buttonStyles("primary", "sm")}>Open workspace</Link></>
          ) : (
            <>
              <Link href="/login" className={buttonStyles("ghost", "sm")}>Sign in</Link>
              <Link href="/signup" className={buttonStyles("primary", "sm")}>Start free</Link>
            </>
          )}
        </nav>
      </Glass>
    </header>
  );
}

export function HeroCta() {
  const { user } = useSession();
  return (
    <div className="flex flex-wrap gap-3">
      <Link href={user ? "/w" : "/signup"} className={buttonStyles("primary", "lg")}>{user ? "Go to your workspace" : "Start free"}</Link>
      <a href="#how-it-works" className={buttonStyles("secondary", "lg")}>See how it works</a>
    </div>
  );
}
