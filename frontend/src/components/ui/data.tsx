"use client";

import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { useId, useRef } from "react";
import { cx } from "./core";

export type TabItem = { id: string; label: ReactNode };

/** Tabs with roving focus (arrow keys move between tabs, as the ARIA pattern expects). */
export function Tabs({ tabs, value, onChange, label, className }: {
  tabs: TabItem[]; value: string; onChange: (id: string) => void; label: string; className?: string;
}) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    let n = -1;
    if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") n = 0;
    if (e.key === "End") n = tabs.length - 1;
    if (n >= 0) {
      e.preventDefault();
      refs.current[n]?.focus();
      onChange(tabs[n].id);
    }
  };
  return (
    <div role="tablist" aria-label={label}
      className={cx("flex gap-1 overflow-x-auto rounded-2xl bg-[var(--inset)] p-1 [scrollbar-width:none]", className)}>
      {tabs.map((t, i) => {
        const active = t.id === value;
        return (
          <button key={t.id} ref={(el) => { refs.current[i] = el; }} role="tab" id={`${base}-${t.id}`} type="button"
            aria-selected={active} tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)} onKeyDown={(e) => onKey(e, i)}
            className={cx("press whitespace-nowrap rounded-xl px-3.5 py-2 text-sm transition-[background-color,color,box-shadow] duration-200",
              active ? "bg-surface font-semibold text-ink shadow-[0_2px_10px_-4px_var(--shadow)]" : "text-ink-3 hover:text-ink")}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Scrolls inside its own box, so wide tables never cause page-level horizontal scroll. */
export function TableWrap({ children, label, maxHeight }: { children: ReactNode; label: string; maxHeight?: string }) {
  return (
    <div role="region" aria-label={label} tabIndex={0}
      className="overflow-auto rounded-[var(--radius-md)] border border-line bg-surface focus-visible:outline-2"
      style={maxHeight ? { maxHeight } : undefined}>
      {children}
    </div>
  );
}
export const Table = ({ children, className }: { children: ReactNode; className?: string }) => (
  <table className={cx("w-full border-collapse text-sm", className)}>{children}</table>
);
export const Th = ({ className, ...p }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th scope="col" {...p} className={cx("sticky top-0 z-10 border-b border-line bg-surface px-4 py-2.5 text-left text-xs font-semibold text-ink-3", className)} />
);
export const Td = ({ className, ...p }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td {...p} className={cx("border-b border-line px-4 py-3 align-top text-ink-2", className)} />
);
