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
      <div className="pointer-events-none fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[70] flex flex-col gap-2 sm:inset-x-auto sm:right-5 sm:w-96 md:bottom-5">
      {(["success", "error"] as const).map((kind) => (
        <div key={kind} aria-live={kind === "error" ? "assertive" : "polite"} role={kind === "error" ? "alert" : "status"}
          className="flex flex-col gap-2">
          {toasts.filter((t) => t.kind === kind).map((t) => (
            <div key={t.id} className="toast-in glass glass-dense pointer-events-auto flex w-full items-start gap-3 px-4 py-3 text-sm">
              <span className={cx("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
                t.kind === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
                {t.kind === "success" ? <CheckCircle2 className="size-4" aria-hidden /> : <AlertTriangle className="size-4" aria-hidden />}
              </span>
              <p className="flex-1 pt-0.5 font-medium text-ink">{t.text}</p>
              <button aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
                className="press -mr-1 grid size-7 place-items-center rounded-lg text-ink-3 hover:bg-[var(--inset)] hover:text-ink">
                <X className="size-3.5" />
              </button>
            </div>
          ))}
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
      className="ui-dialog glass m-auto w-[min(460px,calc(100vw-2rem))] p-0 text-ink"
    >
      <div className="flex gap-4 px-6 pt-6">
        {danger && (
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-danger-soft text-danger">
            <AlertTriangle className="size-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h2 id="confirm-title" className="font-ui text-lg font-semibold">{title}</h2>
          <div className="mt-1.5 text-sm leading-relaxed text-ink-2">{body}</div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-[var(--glass-border)] px-6 py-4">
        <Button variant="secondary" onClick={() => onClose(false)} autoFocus>Cancel</Button>
        <Button className={cx(danger && "bg-d-stop text-white shadow-none hover:brightness-110")} onClick={() => onClose(true)}>{confirm}</Button>
      </div>
    </dialog>
  );
}
