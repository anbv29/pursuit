"use client";

import { usePathname } from "next/navigation";

/** Three blurred, slowly drifting orbs behind everything. Dimmed inside the app
 * so colour never competes with data. Decorative only. */
export function BackdropOrbs() {
  const path = usePathname();
  const inApp = path.startsWith("/w/") || path.startsWith("/onboarding");
  return (
    <div className="backdrop-orbs" data-dim={inApp} aria-hidden>
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
    </div>
  );
}
