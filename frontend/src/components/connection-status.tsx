"use client";

import { useEffect, useState } from "react";

export function ConnectionStatus({ message = "Connecting to Pursuit…" }: { message?: string }) {
  const [stage, setStage] = useState<"hidden" | "connecting" | "waiting">("hidden");
  useEffect(() => {
    const brief = setTimeout(() => setStage("connecting"), 750);
    const waiting = setTimeout(() => setStage("waiting"), 8000);
    return () => { clearTimeout(brief); clearTimeout(waiting); };
  }, []);

  if (stage === "hidden") return null;
  return (
    <div role="status" className="space-y-1 text-sm text-ink-2">
      <p>{stage === "waiting" ? "Waiting for Pursuit’s server…" : message}</p>
      {stage === "waiting" && <p className="text-xs leading-relaxed text-ink-3">
        After a break, our free hosting can take about a minute to wake up. This page will continue automatically. Your entries stay here while you wait.
      </p>}
    </div>
  );
}
