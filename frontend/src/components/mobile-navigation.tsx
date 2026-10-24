"use client";

import { MoreHorizontal, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Drawer, cx } from "./ui";

type Item = { href: string; label: string; icon: LucideIcon; count?: number };

export function MobileNavigation({ primary, more, isActive }: {
  primary: Item[]; more: Item[]; isActive: (item: Item) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const moreActive = more.some(isActive);
  const labels: Record<string, string> = { Dashboard: "Home", "Company reports": "Reports", "Fo Assistant": "Assistant" };
  return <>
    <nav aria-label="Mobile navigation" className="mobile-navigation print:hidden md:hidden">
      <div className="mx-auto grid w-full max-w-lg grid-cols-4 gap-1">
        {primary.map(item => {
          const active = isActive(item);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
            className={cx("mobile-tab", active && "mobile-tab-active")}>
            <span className="mobile-tab-icon"><item.icon size={20} aria-hidden="true" /></span>
            <span>{labels[item.label] ?? item.label}</span>
          </Link>;
        })}
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
          aria-label="More pages" className={cx("mobile-tab", moreActive && "mobile-tab-active")}>
          <span className="mobile-tab-icon"><MoreHorizontal size={20} aria-hidden="true" /></span>
          <span>More</span>
        </button>
      </div>
    </nav>
    <Drawer open={open} onClose={() => setOpen(false)} title="Your workspace" className="mobile-navigation-sheet">
      <nav aria-label="More workspace pages" className="space-y-2">
        {more.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
          aria-current={isActive(item) ? "page" : undefined}
          className={cx("flex min-h-14 items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm",
            isActive(item) ? "bg-trail-soft font-semibold text-trail-strong" : "bg-surface text-ink")}>
          <item.icon size={20} aria-hidden="true" /><span className="min-w-0 flex-1">{item.label}</span>
          {!!item.count && <span className="rounded-full bg-trail-soft px-2 py-0.5 text-xs font-semibold">{item.count} waiting</span>}
        </Link>)}
      </nav>
    </Drawer>
  </>;
}
