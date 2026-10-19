// Pure class-name helpers: no "use client", so server components can use them too.

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export type Variant = "primary" | "secondary" | "ghost" | "danger";
export const BTN: Record<Variant, string> = {
  primary:
    "bg-accent-strong text-accent-ink shadow-[0_4px_12px_-6px_var(--shadow)] hover:brightness-105 hover:shadow-[0_8px_18px_-10px_var(--shadow)]",
  secondary: "surface text-ink hover:border-line-strong hover:bg-surface",
  ghost: "text-ink-2 hover:bg-[var(--inset)] hover:text-ink",
  danger: "surface text-danger hover:bg-danger-soft hover:border-danger/40",
};
export const SIZE = { sm: "h-8 px-3 text-[13px] rounded-[10px]", md: "h-10 px-4 text-sm rounded-xl", lg: "h-12 px-6 text-base rounded-2xl" };

/** Same look as <Button>, for links and other elements that act as buttons. */
export const buttonStyles = (variant: Variant = "primary", size: "sm" | "md" | "lg" = "md", className?: string) =>
  cx("press inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium",
    "transition-[background-color,border-color,box-shadow,filter,color,transform] duration-150 ease-[var(--ease-out)]",
    SIZE[size], BTN[variant], className);
