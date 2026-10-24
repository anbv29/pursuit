"use client";

import { Menu as MenuIcon, Plus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { Drawer, cx } from "./ui";

type Item = { href: string; label: string; icon: LucideIcon; count?: number };

export function MobileNavigation({ tabs, menuItems, newHref, isActive, switcher }: {
  tabs: Item[];
  menuItems: Item[];
  newHref: string;
  isActive: (item: Item) => boolean;
  switcher?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const labels: Record<string, string> = { Dashboard: "Home", "Company reports": "Reports" };
  const menuActive = menuItems.some(isActive);
  return <>
    <nav aria-label="Mobile navigation" className="mobile-navigation print:hidden md:hidden">
      <div className="mx-auto grid w-full max-w-lg grid-cols-5 items-end gap-1">
        {tabs.slice(0, 2).map(item => {
          const active = isActive(item);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
            className={cx("mobile-tab", active && "mobile-tab-active")}>
            <span className="mobile-tab-icon"><item.icon size={20} aria-hidden="true" /></span>
            <span>{labels[item.label] ?? item.label}</span>
          </Link>;
        })}
        <Link href={newHref} aria-label="New experiment"
          className="flex flex-col items-center gap-1 pb-0.5 text-[11px] font-semibold text-ink">
          <span className="press grid size-12 -translate-y-3 place-items-center rounded-full bg-accent text-bg shadow-[0_10px_24px_-8px_rgba(15,118,110,0.55)]">
            <Plus size={22} aria-hidden="true" />
          </span>
        </Link>
        {tabs.slice(2).map(item => {
          const active = isActive(item);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
            className={cx("mobile-tab", active && "mobile-tab-active")}>
            <span className="mobile-tab-icon"><item.icon size={20} aria-hidden="true" /></span>
            <span className="relative">{labels[item.label] ?? item.label}
              {!!item.count && <span className="absolute -right-2.5 -top-2 size-2 rounded-full bg-warning ring-2 ring-[var(--surface-solid)]" aria-hidden />}
              {!!item.count && <span className="sr-only">{item.count} waiting</span>}
            </span>
          </Link>;
        })}
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
          aria-label="Menu" className={cx("mobile-tab", menuActive && "mobile-tab-active")}>
          <span className="mobile-tab-icon"><MenuIcon size={20} aria-hidden="true" /></span>
          <span>Menu</span>
        </button>
      </div>
    </nav>
    <Drawer open={open} onClose={() => setOpen(false)} title="Your workspace" className="mobile-navigation-sheet">
      <nav aria-label="More workspace pages" className="space-y-2">
        {switcher && <div className="pb-2">{switcher}</div>}
        {menuItems.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
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
