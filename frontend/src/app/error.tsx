"use client";

import Link from "next/link";
import { SystemCard } from "@/components/system-card";
import { Button, buttonStyles } from "@/components/ui";

// Next 16 error boundaries receive `retry` (re-renders the failed segment).
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";
  return (
    <SystemCard code="500" title="Something went wrong" body={<>
      This page hit an unexpected problem. Your data is safe. Try again, or head back home.
      {digest && <span className="mt-2 block text-xs text-ink-3">Reference: {digest}</span>}
    </>}>
      <Button onClick={() => retry()}>Try again</Button>
      <Link href="/" className={buttonStyles("secondary")}>Go home</Link>
    </SystemCard>
  );
}
