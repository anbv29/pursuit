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
      <Glass as="div" className="landing-nav mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 rounded-[16px] px-4 sm:px-5">
        <Logo />
        <nav aria-label="Product" className="hidden items-center gap-7 text-sm text-ink-2 lg:flex">
          <a href="/#how-it-works" className="py-3 hover:text-ink">The process</a>
          <a href="/#capabilities" className="py-3 hover:text-ink">What you can do</a>
          <a href="/#pricing" className="py-3 hover:text-ink">Pricing</a>
        </nav>
        <nav aria-label="Account" className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <Link href="/#pricing" className="hidden text-sm font-medium text-ink-2 hover:text-ink sm:block lg:hidden">Pricing</Link>
          {ready && user ? (
            <><Link href="/account" className={buttonStyles("ghost", "sm")}>Account</Link><Link href="/w" className={buttonStyles("primary", "sm")}>Open workspace</Link></>
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
