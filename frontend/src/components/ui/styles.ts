// Pure class-name helpers: no "use client", so server components can use them too.

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export type Variant = "primary" | "secondary" | "ghost" | "danger";
export const BTN: Record<Variant, string> = {
  primary:
    "border border-transparent bg-accent-strong text-accent-ink shadow-[0_2px_3px_var(--shadow),inset_0_1px_0_#ffffff26] hover:brightness-95",
  secondary: "border border-line bg-surface text-ink shadow-xs hover:border-ink hover:bg-sunken",
  ghost: "text-ink-2 hover:bg-[var(--inset)] hover:text-ink",
  danger: "border border-line-strong bg-surface text-danger hover:bg-danger-soft hover:border-danger/40",
};
export const SIZE = { sm: "min-h-8 px-3 py-1.5 text-[13px] rounded-md", md: "min-h-10 px-4 py-2 text-sm rounded-lg", lg: "min-h-12 px-6 py-3 text-base rounded-lg" };

/** Same look as <Button>, for links and other elements that act as buttons. */
export const buttonStyles = (variant: Variant = "primary", size: "sm" | "md" | "lg" = "md", className?: string) =>
  cx("press inline-flex items-center justify-center max-w-full gap-1.5 whitespace-normal text-center leading-5 font-medium [&>svg]:shrink-0",
    "transition-[background-color,border-color,box-shadow,filter,color,transform] duration-150 ease-[var(--ease-out)]",
    SIZE[size], BTN[variant], className);
