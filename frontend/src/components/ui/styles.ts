// Pure class-name helpers: no "use client", so server components can use them too.

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export type Variant = "primary" | "secondary" | "ghost" | "danger";
export const BTN: Record<Variant, string> = {
  primary:
    "border border-transparent bg-accent-strong text-accent-ink hover:brightness-95",
  secondary: "surface text-ink hover:border-line-strong hover:bg-surface",
  ghost: "text-ink-2 hover:bg-[var(--inset)] hover:text-ink",
  danger: "surface text-danger hover:bg-danger-soft hover:border-danger/40",
};
export const SIZE = { sm: "min-h-8 px-3 py-1.5 text-[13px] rounded-[10px]", md: "min-h-10 px-4 py-2 text-sm rounded-xl", lg: "min-h-12 px-6 py-3 text-base rounded-[14px]" };

/** Same look as <Button>, for links and other elements that act as buttons. */
export const buttonStyles = (variant: Variant = "primary", size: "sm" | "md" | "lg" = "md", className?: string) =>
  cx("press inline-flex items-center justify-center max-w-full gap-1.5 whitespace-normal text-center leading-5 font-medium [&>svg]:shrink-0",
    "transition-[background-color,border-color,box-shadow,filter,color,transform] duration-150 ease-[var(--ease-out)]",
    SIZE[size], BTN[variant], className);
