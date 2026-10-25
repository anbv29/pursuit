"use client";

import { CornerDownLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cx } from "./ui";

export type Command = { id: string; label: string; hint?: string; icon?: ReactNode; run: () => void } | { id: string; label: string; hint?: string; icon?: ReactNode; href: string };

/**
 * Cmd/Ctrl+K command palette. Commands are passed in by the shell (existing
 * routes and actions only); this component just filters and runs them.
 */
export function CommandPalette({ commands, open, onOpenChange }: {
  commands: Command[]; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? commands.filter((c) => c.label.toLowerCase().includes(s) || c.hint?.toLowerCase().includes(s)) : commands;
  }, [q, commands]);

  const close = () => {
    onOpenChange(false);
    setQ("");
    setActive(0);
  };
  const run = (c: Command) => {
    close();
    if ("href" in c) router.push(c.href);
    else c.run();
  };

  return (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); close(); }} aria-label="Command palette"
      className="ui-dialog glass m-0 [&[open]]:flex [&:not([open])]:hidden h-dvh max-h-none w-screen max-w-none flex-col rounded-none p-0 text-ink sm:mx-auto sm:mt-[12vh] sm:h-auto sm:w-[560px] sm:rounded-[20px]"
      onClick={(e) => { if (e.target === ref.current) close(); }}>
      <div className="flex items-center gap-2 border-b border-[var(--glass-border)] px-4">
        <Search className="size-4 shrink-0 text-ink-3" aria-hidden />
        <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }}
          placeholder="Go to, or search actions…" aria-label="Search commands" role="combobox" aria-expanded aria-controls={listId}
          aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter" && results[active]) { e.preventDefault(); run(results[active]); }
          }}
          className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3" />
        <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-ink-3">Esc</kbd>
      </div>
      <ul id={listId} role="listbox" aria-label="Commands" className="min-h-0 flex-1 overflow-y-auto p-2 sm:max-h-80 sm:flex-none">
        {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-3">No matches.</li>}
        {results.map((c, i) => (
          <li key={c.id} id={`${listId}-${c.id}`} role="option" aria-selected={i === active}
            onPointerMove={() => setActive(i)} onClick={() => run(c)}
            className={cx("flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
              i === active ? "bg-[var(--inset)] text-ink" : "text-ink-2")}>
            <span className="grid size-7 place-items-center rounded-lg bg-surface text-ink-2 ring-1 ring-line">{c.icon}</span>
            <span className="flex-1">{c.label}{c.hint && <span className="ml-2 text-xs text-ink-3">{c.hint}</span>}</span>
            {i === active && <CornerDownLeft className="size-3.5 text-ink-3" aria-hidden />}
          </li>
        ))}
      </ul>
    </dialog>
  );
}
