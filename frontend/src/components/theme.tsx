"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cx, Tooltip } from "./ui";

export type ThemeChoice = "system" | "light" | "dark";
const KEY = "pursuit.theme";
const EVT = "pursuit:theme";

function read(): ThemeChoice {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}
const subscribe = (cb: () => void) => {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
};

export function setTheme(t: ThemeChoice) {
  try {
    if (t === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {
    /* storage blocked: still apply for this page */
  }
  if (t === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  window.dispatchEvent(new Event(EVT));
}

export function useTheme(): ThemeChoice {
  return useSyncExternalStore(subscribe, read, () => "system");
}

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: "light", light: "dark", dark: "system" };
const META = {
  system: { Icon: Monitor, label: "Theme: system" },
  light: { Icon: Sun, label: "Theme: light" },
  dark: { Icon: Moon, label: "Theme: dark" },
};

/** Cycles system → light → dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTheme();
  const { Icon, label } = META[t];
  return (
    <button type="button" onClick={() => setTheme(NEXT[t])} aria-label={`${label}. Change theme`} title={label}
      className={cx("press grid size-9 place-items-center rounded-xl text-ink-2 transition-colors hover:bg-[var(--inset)] hover:text-ink", className)}>
      <Icon className="size-[18px]" aria-hidden />
    </button>
  );
}
