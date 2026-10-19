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
    <header className="sticky top-0 z-30 px-3 pt-3">
      <Glass as="div" className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-[20px] px-3 sm:px-4">
        <Logo />
        <nav aria-label="Account" className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {ready && user ? (
            <Link href="/w" className={buttonStyles("primary", "sm")}>Open workspace</Link>
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
