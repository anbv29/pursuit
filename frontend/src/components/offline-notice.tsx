"use client";

import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** Shows a calm notice while the browser is offline; disappears when back online. */
export function OfflineNotice() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" className="glass glass-dense toast-in fixed inset-x-0 top-3 z-[80] mx-auto flex w-fit max-w-[calc(100vw-1.5rem)] items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink">
      <WifiOff className="size-4 text-warning" aria-hidden />
      You&apos;re offline. Changes will fail until you reconnect.
    </div>
  );
}
