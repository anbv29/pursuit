"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { cx } from "./styles";

/**
 * Modal dialog on the native <dialog> element: real focus trap, Esc to close,
 * inert background. Enters by materialising (scale + blur), not a plain fade.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = "md" }: {
  open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children?: ReactNode;
  footer?: ReactNode; size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); onClose(); }} aria-labelledby={`${id}-t`}
      aria-describedby={description ? `${id}-d` : undefined}
      className={cx("ui-dialog glass m-auto w-[calc(100vw-2rem)] p-0 text-ink",
        size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-md")}>
      <div className="flex items-start justify-between gap-3 px-6 pt-6">
        <div>
          <h2 id={`${id}-t`} className="font-ui text-lg font-semibold">{title}</h2>
          {description && <p id={`${id}-d`} className="mt-1 text-sm text-ink-2">{description}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="press -mr-2 -mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-[var(--inset)] hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
      {children && <div className="px-6 pt-4 text-sm text-ink-2">{children}</div>}
      {footer && <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-[var(--glass-border)] px-6 py-4">{footer}</div>}
      {!footer && <div className="h-6" />}
    </dialog>
  );
}

/** Side sheet: slides from the right on desktop, up from the bottom on phones. */
export function Drawer({ open, onClose, title, children, className }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); onClose(); }} aria-labelledby={`${id}-t`}
      className={cx("ui-drawer glass [&[open]]:flex m-0 mt-auto flex-col h-[85dvh] max-h-none w-full max-w-none p-0 text-ink sm:mt-0 sm:ml-auto sm:h-dvh sm:w-[440px]", className)}>
      <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-5 py-4">
        <h2 id={`${id}-t`} className="font-ui text-lg font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="press grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-[var(--inset)] hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-surface/70 p-5">{children}</div>
    </dialog>
  );
}

/** Hover/focus tooltip. Content is also exposed to assistive tech via aria-describedby. */
export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  const id = useId();
  return (
    <span className="group/tt relative inline-flex" aria-describedby={id}>
      {children}
      <span id={id} role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[240px] -translate-x-1/2 translate-y-1 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-bg opacity-0 shadow-lg transition duration-150 group-focus-within/tt:translate-y-0 group-focus-within/tt:opacity-100 group-hover/tt:translate-y-0 group-hover/tt:opacity-100">
        {content}
      </span>
    </span>
  );
}

export type MenuItem = { label: string; onSelect: () => void; icon?: ReactNode; danger?: boolean };

/** Dropdown menu with keyboard support (arrow keys, Home/End, Esc returns focus). */
export function Menu({ trigger, items, align = "end", label }: {
  trigger: (p: { open: boolean; toggle: () => void; id: string }) => ReactNode; items: MenuItem[];
  align?: "start" | "end"; label: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    const onDoc = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open]);
  const onKey = (e: React.KeyboardEvent) => {
    const els = Array.from(list.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? []);
    const i = els.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") { e.preventDefault(); els[(i + 1) % els.length]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); els[(i - 1 + els.length) % els.length]?.focus(); }
    if (e.key === "Home") { e.preventDefault(); els[0]?.focus(); }
    if (e.key === "End") { e.preventDefault(); els[els.length - 1]?.focus(); }
    if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      if (e.key === "Escape") root.current?.querySelector<HTMLElement>(`[aria-controls="${id}"]`)?.focus();
    }
  };
  return (
    <div ref={root} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o), id })}
      {open && (
        <div ref={list} id={id} role="menu" aria-label={label} onKeyDown={onKey}
          className={cx("ui-pop glass glass-dense absolute top-full z-50 mt-2 min-w-48 p-1.5", align === "end" ? "right-0 origin-top-right" : "left-0 origin-top-left")}>
          {items.map((it) => (
            <button key={it.label} role="menuitem" type="button"
              onClick={() => { setOpen(false); it.onSelect(); }}
              className={cx("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm outline-none transition-colors",
                it.danger ? "text-danger hover:bg-danger-soft focus:bg-danger-soft" : "text-ink hover:bg-[var(--inset)] focus:bg-[var(--inset)]")}>
              {it.icon}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
