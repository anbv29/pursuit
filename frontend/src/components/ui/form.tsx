"use client";

import { Check, Eye, EyeOff } from "lucide-react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useId, useState } from "react";
import { cx } from "./styles";

export function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: (id: string, describedBy?: string) => ReactNode;
}) {
  const id = useId();
  const desc = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-ink-2">{label}</label>
      {children(id, desc)}
      {error ? <p id={desc} role="alert" className="text-xs font-medium text-danger">{error}</p>
        : hint ? <p id={desc} className="text-xs text-ink-3">{hint}</p> : null}
    </div>
  );
}

const FIELD = cx(
  "w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-3",
  "shadow-[inset_0_1px_2px_var(--inset)] transition-[border-color,box-shadow] duration-150",
  "hover:border-line-strong focus:border-accent focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent)_22%,transparent)]",
  "aria-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:opacity-60",
);

export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={cx(FIELD, "h-10", className)} />
);
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={cx(FIELD, "min-h-20 py-2.5 leading-relaxed", className)} />
);
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={cx(FIELD, "h-10 pr-8", className)} />
);

/** Password input with a visible show/hide toggle. Behaves exactly like Input otherwise. */
export function PasswordInput({ className, ...p }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...p} type={visible ? "text" : "password"} className={cx(FIELD, "h-10 pr-11", className)} />
      <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible} className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-3 hover:bg-[var(--inset)] hover:text-ink">
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function Checkbox({ label, className, ...p }: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: ReactNode }) {
  return (
    <label className={cx("inline-flex cursor-pointer items-center gap-2.5 text-sm text-ink", className)}>
      <span className="relative grid size-[18px] place-items-center">
        <input {...p} type="checkbox" className="peer absolute inset-0 cursor-pointer appearance-none rounded-md border border-line-strong bg-surface transition-colors checked:border-accent-strong checked:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]" />
        <Check className="pointer-events-none relative size-3 text-accent-ink opacity-0 peer-checked:opacity-100" strokeWidth={3} aria-hidden />
      </span>
      {label}
    </label>
  );
}

/** Accessible switch (role="switch"). Controlled. */
export function Switch({ checked, onChange, label, description, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p id={`${id}-l`} className="text-sm font-medium text-ink">{label}</p>
        {description && <p id={`${id}-d`} className="mt-0.5 text-[13px] text-ink-3">{description}</p>}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-labelledby={`${id}-l`} aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled} onClick={() => onChange(!checked)}
        className={cx("relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 disabled:opacity-50",
          checked ? "border-accent-strong bg-accent-strong" : "border-line-strong bg-[var(--inset)]")}>
        <span className={cx("absolute left-0.5 top-0.5 size-[18px] rounded-full bg-white shadow transition-transform duration-200 ease-[var(--ease-out)]",
          checked && "translate-x-5")} />
      </button>
    </div>
  );
}
