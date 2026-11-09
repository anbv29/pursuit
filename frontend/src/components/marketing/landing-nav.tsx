"use client";

import Link from "next/link";
import { Logo } from "../brand";
import { useSession } from "../session";
import { ThemeToggle } from "../theme";
import { buttonStyles, Glass } from "../ui";
import styles from "./studio.module.css";

export function LandingNav() {
  const { user, ready } = useSession();
  return (
    <header className={styles.navHeader}>
      <Glass as="div" className={`landing-nav ${styles.nav}`}>
        <Logo />
        <nav aria-label="Product" className={styles.productNav}>
          {[
            ["Sample report", "/sample"],
            ["Process", "/#how-it-works"],
            ["What you can do", "/#capabilities"],
            ["The toolkit", "/#pricing"],
          ].map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <nav aria-label="Account" className="flex items-center justify-end gap-1.5 sm:gap-2 lg:justify-self-end">
          <ThemeToggle />
          <Link href="/#pricing" className="hidden text-sm font-medium text-ink-2 hover:text-ink sm:block lg:hidden">The toolkit</Link>
          {ready && user ? (
            <><span className="hidden sm:inline-flex"><Link href="/account" className={buttonStyles("ghost", "sm")}>Account</Link></span><Link href="/w" className={buttonStyles("primary", "sm")}>Open workspace</Link></>
          ) : (
            <>
              <Link href="/login" className={buttonStyles("ghost", "sm")}>Sign in</Link>
              <Link href="/signup" className={buttonStyles("primary", "sm")}>Get started</Link>
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
    <div className="grid gap-3 sm:flex sm:flex-wrap">
      <Link href={user ? "/w" : "/signup"} className={buttonStyles("primary", "lg")}>{user ? "Go to your workspace" : "Get started"}</Link>
      <Link href="/sample" className={buttonStyles("secondary", "lg")}>Read a real report</Link>
    </div>
  );
}

export function MobileCtaDock() {
  const { user } = useSession();
  return (
    <div className={`cta-dock sm:mx-2 ${styles.dock}`}>
      <Link href={user ? "/w" : "/signup"} className={`${buttonStyles("primary", "lg")} w-full`}>
        Analyze a company
      </Link>
    </div>
  );
}
