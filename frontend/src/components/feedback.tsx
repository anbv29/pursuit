"use client";

import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button, cx } from "./ui";

type Toast = { id: number; kind: "success" | "error"; text: string };
type ConfirmOpts = { title: string; body: ReactNode; confirm: string; danger?: boolean };

const Ctx = createContext<{
  toast: (kind: Toast["kind"], text: string) => void;
  confirm: (o: ConfirmOpts) => Promise<boolean>;
} | null>(null);

export function useFeedback() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFeedback outside FeedbackProvider");
  return c;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const nextId = useRef(1);

  const toast = useCallback((kind: Toast["kind"], text: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const confirm = useCallback(
    (o: ConfirmOpts) => new Promise<boolean>((resolve) => setDialog({ ...o, resolve })),
    [],
  );

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-start gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm shadow-pop">
            {t.kind === "success"
              ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-trail" aria-hidden />
              : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-d-stop" aria-hidden />}
            <p className="flex-1 text-ink-2">{t.text}</p>
            <button aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-ink-3 hover:text-ink">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
      {dialog && (
        <ConfirmDialog
          {...dialog}
          onClose={(v) => {
            dialog.resolve(v);
            setDialog(null);
          }}
        />
      )}
    </Ctx.Provider>
  );
}

function ConfirmDialog({ title, body, confirm, danger, onClose }: ConfirmOpts & { onClose: (v: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose(false);
      }}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(440px,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-0 shadow-pop backdrop:bg-ink/30"
    >
      <div className="p-5">
        <h2 id="confirm-title" className="text-base font-semibold text-ink">{title}</h2>
        <div className="mt-2 text-sm text-ink-2">{body}</div>
      </div>
      <div className="flex justify-end gap-2 border-t border-line bg-paper px-5 py-3">
        <Button variant="secondary" onClick={() => onClose(false)} autoFocus>Cancel</Button>
        <Button className={cx(danger && "bg-d-stop hover:bg-d-stop/90")} onClick={() => onClose(true)}>{confirm}</Button>
      </div>
    </dialog>
  );
}
